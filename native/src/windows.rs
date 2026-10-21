//! Windows 구현. 전용 스레드에 WH_KEYBOARD_LL 훅과 EVENT_SYSTEM_FOREGROUND WinEvent 훅을 걸고 메시지 루프를 돌린다.
//! 두 콜백 모두 그 스레드의 `GetMessageW` 안에서 불리므로 콜백이 쓰는 상태는 스레드 로컬에 둔다.
//!
//! 키보드 훅에서 읽는 값은 메시지 종류와 `KBDLLHOOKSTRUCT.vkCode`뿐이다. vkCode는 수식키 판정과 반복 필터에만 넘기고
//! 콜백 밖의 어떤 값에도 담지 않는다. 바깥으로 나가는 것은 포그라운드 콜백이 채운 활성 앱 캐시의 복사본뿐이다.

mod identity;

use std::cell::{OnceCell, RefCell};
use std::ffi::c_void;
use std::ptr;
use std::sync::mpsc::{self, SyncSender};
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

use ::windows::core::{w, BOOL, PCWSTR, PWSTR};
use ::windows::Win32::Foundation::{
    CloseHandle, FALSE, HANDLE, HWND, LPARAM, LRESULT, TRUE, WPARAM,
};
use ::windows::Win32::Storage::FileSystem::{
    GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW,
};
use ::windows::Win32::System::Threading::{
    GetCurrentThreadId, OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
    PROCESS_QUERY_LIMITED_INFORMATION,
};
use ::windows::Win32::UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK};
use ::windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, EnumChildWindows, GetForegroundWindow, GetMessageW, GetWindowThreadProcessId,
    PeekMessageW, PostThreadMessageW, SetWindowsHookExW, UnhookWindowsHookEx,
    EVENT_SYSTEM_FOREGROUND, KBDLLHOOKSTRUCT, MSG, PM_NOREMOVE, WH_KEYBOARD_LL,
    WINEVENT_OUTOFCONTEXT, WINEVENT_SKIPOWNPROCESS, WM_KEYDOWN, WM_KEYUP, WM_QUIT, WM_SYSKEYDOWN,
    WM_SYSKEYUP, WM_USER,
};
use napi::{Error, Result};

use self::identity::{
    file_description_query, file_name, from_wide, identity_from_path, is_frame_host, to_wide,
    units_at, PidCache,
};
use crate::filter::{is_modifier_vk, RepeatFilter};
use crate::{AppIdentity, OnKeydown, PermissionStatus};

const KEYBOARD_HOOK_FAILED: &str = "키보드 훅을 설치하지 못했습니다";
const FOREGROUND_HOOK_FAILED: &str = "활성 창 변경 훅을 설치하지 못했습니다";

/// keyUp을 놓친 키를 눌린 상태에서 풀어 주는 시간.
const REPEAT_TTL: Duration = Duration::from_secs(5);

/// `QueryFullProcessImageNameW` 버퍼 길이(u16 개수). Win32 경로의 최대 길이(32767자 + NUL)까지 담는다.
const IMAGE_PATH_CAPACITY: usize = 32_768;

/// WM_QUIT을 보내지 못했을 때 다시 보내는 간격. 훅 스레드가 살아 있는 동안만 다시 보낸다.
const STOP_RETRY: Duration = Duration::from_millis(10);

type AppCache = Arc<Mutex<Option<AppIdentity>>>;

/// 훅 스레드가 `ready`로 알리는 결과. 성공이면 WM_QUIT을 받을 스레드 ID, 실패면 JS로 보낼 이유.
type Started = std::result::Result<u32, &'static str>;

static HOOK: Mutex<Option<Hook>> = Mutex::new(None);

/// 훅 콜백이 결과를 넘기는 곳. 훅 스레드가 훅을 걸기 전에 한 번 채운다.
struct Sink {
    on_keydown: OnKeydown,
    cache: AppCache,
}

thread_local! {
    static SINK: OnceCell<Sink> = const { OnceCell::new() };
    /// 떼지 않은 키를 기억하는 반복 필터. 키보드 훅 콜백만 쓴다.
    static FILTER: RefCell<RepeatFilter> = RefCell::new(RepeatFilter::new(REPEAT_TTL));
    /// PID 캐시를 이어 쓰는 활성 앱 해석기. 포그라운드 콜백과 시작 시 초기화만 쓴다.
    static RESOLVER: RefCell<Resolver> = RefCell::new(Resolver::default());
}

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(PoisonError::into_inner)
}

pub fn start(on_keydown: OnKeydown) -> Result<()> {
    let mut hook = lock(&HOOK);
    if let Some(previous) = hook.take() {
        previous.stop();
    }
    *hook = Some(Hook::spawn(on_keydown)?);
    Ok(())
}

pub fn stop() {
    let running = lock(&HOOK).take();
    if let Some(running) = running {
        running.stop();
    }
}

pub fn permission_status() -> PermissionStatus {
    PermissionStatus::NotRequired
}

pub fn request_permission() {}

pub fn current_app() -> Option<AppIdentity> {
    let cache = lock(&HOOK).as_ref().map(|hook| Arc::clone(&hook.cache));
    match cache {
        Some(cache) => lock(&cache).clone(),
        None => foreground_app(&mut Resolver::default()),
    }
}

/// 돌고 있는 훅 스레드와 그 스레드를 멈추는 데 필요한 것들.
struct Hook {
    /// 메시지 큐를 만든 뒤 알려 온 훅 스레드 ID. WM_QUIT을 보낼 곳이다.
    thread_id: u32,
    thread: JoinHandle<()>,
    cache: AppCache,
}

impl Hook {
    fn spawn(on_keydown: OnKeydown) -> Result<Self> {
        let cache: AppCache = Arc::new(Mutex::new(None));
        let (ready, started) = mpsc::sync_channel(1);
        let hook_cache = Arc::clone(&cache);
        let thread = thread::Builder::new()
            .name("keydown-hook".into())
            .spawn(move || run_hooks(on_keydown, hook_cache, ready))
            .map_err(|error| {
                Error::from_reason(format!("키보드 훅 스레드를 만들지 못했습니다: {error}"))
            })?;
        // 훅 스레드는 두 훅을 다 건 뒤(또는 실패한 뒤)에만 보낸다. 그 전에 끝나면(패닉) 송신 쪽이 버려져 Err가 온다.
        // 그래서 Hook이 만들어지면 thread_id는 항상 알려진 상태이고, stop이 ID를 기다릴 일이 없다.
        match started.recv() {
            Ok(Ok(thread_id)) => Ok(Self {
                thread_id,
                thread,
                cache,
            }),
            Ok(Err(reason)) => {
                let _ = thread.join();
                Err(Error::from_reason(reason))
            }
            Err(_) => {
                let _ = thread.join();
                Err(Error::from_reason(KEYBOARD_HOOK_FAILED))
            }
        }
    }

    fn stop(self) {
        while !self.thread.is_finished() {
            // 안전: thread_id는 메시지 큐를 만든 훅 스레드의 ID이고, 그 스레드가 아직 끝나지 않았음을 바로 앞에서 확인했다.
            let posted =
                unsafe { PostThreadMessageW(self.thread_id, WM_QUIT, WPARAM(0), LPARAM(0)) };
            if posted.is_ok() {
                break;
            }
            thread::sleep(STOP_RETRY);
        }
        let _ = self.thread.join();
    }
}

/// 훅 스레드 본체. 메시지 큐를 만들고 포그라운드 훅 → 활성 앱 캐시 초기화 → 키보드 훅 순으로 준비한 뒤 스레드 ID를
/// `ready`로 알리고, WM_QUIT이 올 때까지 메시지 루프를 돌린다. 루프가 끝나면 두 훅을 푼다.
/// 훅을 걸지 못하면 먼저 건 훅을 풀고 이유를 보낸 뒤 끝낸다.
fn run_hooks(on_keydown: OnKeydown, cache: AppCache, ready: SyncSender<Started>) {
    let mut message = MSG::default();
    // 메시지 큐가 없는 스레드에는 PostThreadMessageW가 실패하므로, 스레드 ID를 알리기 전에 큐부터 만든다
    // (PostThreadMessageW 문서가 권하는 PeekMessage 호출).
    // 안전: message는 이 스택의 MSG이고, PM_NOREMOVE라 아무 메시지도 꺼내지 않는다.
    let _ = unsafe { PeekMessageW(&mut message, None, WM_USER, WM_USER, PM_NOREMOVE) };
    let _ = SINK.with(|sink| {
        sink.set(Sink {
            on_keydown,
            cache: Arc::clone(&cache),
        })
    });

    // OUTOFCONTEXT라 다른 프로세스에 주입되지 않고 이 스레드의 메시지 루프에서 불린다. 모든 프로세스·스레드(0, 0)의
    // 포그라운드 변경을 받되, SKIPOWNPROCESS로 이 프로세스(Electron) 창이 앞으로 온 변경은 받지 않는다.
    // 안전: foreground_proc는 이 모듈의 정적 함수라 훅이 걸려 있는 동안 내내 유효하다.
    let foreground = unsafe {
        SetWinEventHook(
            EVENT_SYSTEM_FOREGROUND,
            EVENT_SYSTEM_FOREGROUND,
            None,
            Some(foreground_proc),
            0,
            0,
            WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS,
        )
    };
    if foreground.is_invalid() {
        let _ = ready.send(Err(FOREGROUND_HOOK_FAILED));
        return;
    }

    // 포그라운드 훅을 건 뒤에 초기화해야 그 사이의 변경이 메시지 루프에서 처리되어 캐시가 최신으로 남는다.
    // 키보드 훅보다 먼저 하는 까닭: 저수준 키보드 훅이 걸린 뒤 메시지를 꺼내지 않는 시간이 길면(버전 리소스 읽기)
    // 그동안 온 키 입력이 시간 초과되어 시스템이 훅을 말없이 제거할 수 있다. WinEvent 훅에는 그런 제한이 없다.
    let app = RESOLVER.with_borrow_mut(foreground_app);
    *lock(&cache) = app;

    // 저수준 훅은 다른 프로세스에 주입되지 않으므로 모듈 핸들 없이(NULL) 전역(스레드 0)으로 건다.
    // 콜백은 훅을 건 이 스레드가 메시지를 꺼낼 때 이 스레드에서 불린다.
    // 안전: keyboard_proc는 이 모듈의 정적 함수라 훅이 걸려 있는 동안 내내 유효하다.
    let keyboard = unsafe { SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_proc), None, 0) };
    let Ok(keyboard) = keyboard else {
        // 안전: foreground는 바로 위에서 이 스레드가 걸었고 아직 풀지 않은 훅이다.
        let _ = unsafe { UnhookWinEvent(foreground) };
        let _ = ready.send(Err(KEYBOARD_HOOK_FAILED));
        return;
    };

    // 안전: 인자 없이 호출 스레드의 ID만 돌려준다.
    let thread_id = unsafe { GetCurrentThreadId() };
    if ready.send(Ok(thread_id)).is_ok() {
        // GetMessageW는 WM_QUIT이면 0, 오류면 -1을 돌려준다. 두 훅 콜백은 이 호출 안에서 불린다.
        // 이 스레드에는 창이 없어 꺼낸 메시지를 디스패치할 곳이 없으므로 버린다.
        // 안전: message는 이 스택의 MSG이고, hwnd None은 이 스레드의 모든 메시지를 뜻한다.
        while unsafe { GetMessageW(&mut message, None, 0, 0) }.0 > 0 {}
    }

    // 안전: 두 핸들 모두 이 스레드가 걸고 아직 풀지 않은 훅이다. 풀고 나면 콜백이 더 불리지 않는다.
    unsafe {
        let _ = UnhookWinEvent(foreground);
        let _ = UnhookWindowsHookEx(keyboard);
    }
}

/// WH_KEYBOARD_LL 콜백. 시스템은 오래 걸리는 저수준 훅을 말없이 제거하므로 판정과 캐시 복사만 하고 바로 넘긴다.
unsafe extern "system" fn keyboard_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    // code가 음수면 처리하지 않고 바로 다음 훅에 넘겨야 한다(HC_ACTION = 0만 처리한다).
    if code >= 0 {
        // 안전: WH_KEYBOARD_LL에서 code가 0 이상이면 lparam은 시스템이 채운 KBDLLHOOKSTRUCT를 가리킨다.
        let vk = unsafe { (*(lparam.0 as *const KBDLLHOOKSTRUCT)).vkCode };
        // wParam은 WM_KEYDOWN·WM_KEYUP·WM_SYSKEYDOWN·WM_SYSKEYUP 중 하나다.
        let message = wparam.0 as u32;
        let counts = FILTER.with(|filter| {
            filter
                .try_borrow_mut()
                .is_ok_and(|mut filter| key_counts(&mut filter, message, vk, Instant::now()))
        });
        if counts {
            emit_cached_app();
        }
    }
    // 안전: 받은 인자를 그대로 다음 훅에 넘긴다. 첫 인자(HHOOK)는 무시되므로 None이다.
    unsafe { CallNextHookEx(None, code, wparam, lparam) }
}

/// 키 메시지 하나가 세어야 할 키다운인지. 수식키 단독 입력과 떼지 않은 키의 반복 keyDown은 세지 않고,
/// keyUp은 필터에서 그 키를 풀기만 한다. vk는 이 판정에만 쓴다.
fn key_counts(filter: &mut RepeatFilter, message: u32, vk: u32, now: Instant) -> bool {
    match message {
        WM_KEYDOWN | WM_SYSKEYDOWN => !is_modifier_vk(vk) && filter.key_down(vk, now),
        WM_KEYUP | WM_SYSKEYUP => {
            filter.key_up(vk);
            false
        }
        _ => false,
    }
}

/// 캐시된 활성 앱을 복사해 `on_keydown`에 넘긴다. 캐시 잠금은 복사하는 동안만 잡는다.
fn emit_cached_app() {
    SINK.with(|sink| {
        if let Some(sink) = sink.get() {
            let app = lock(&sink.cache).clone();
            (sink.on_keydown)(app);
        }
    });
}

/// EVENT_SYSTEM_FOREGROUND WinEvent 콜백. 새 포그라운드 창의 앱을 해석해 캐시에 넣는다.
/// 해석하지 못하면(창이 이미 사라짐, 열 수 없는 프로세스) 이전 앱으로 잘못 세지 않도록 None을 넣는다.
unsafe extern "system" fn foreground_proc(
    _hook: HWINEVENTHOOK,
    event: u32,
    hwnd: HWND,
    _object: i32,
    _child: i32,
    _event_thread: u32,
    _event_time: u32,
) {
    if event != EVENT_SYSTEM_FOREGROUND || hwnd.is_invalid() {
        return;
    }
    let resolved = RESOLVER.with(|resolver| {
        resolver
            .try_borrow_mut()
            .ok()
            .map(|mut resolver| resolver.window_app(hwnd))
    });
    let Some(app) = resolved else {
        return;
    };
    SINK.with(|sink| {
        if let Some(sink) = sink.get() {
            *lock(&sink.cache) = app;
        }
    });
}

/// 창 → 프로세스 → AppIdentity 해석기. 버전 리소스를 매번 읽지 않도록 PID별 결과를 캐시한다.
#[derive(Default)]
struct Resolver {
    apps: PidCache,
}

impl Resolver {
    /// UWP 앱은 포그라운드 창이 ApplicationFrameHost.exe의 프레임이므로, 자식 창 중 다른 프로세스의 창을 찾아
    /// 그 프로세스를 앱으로 본다. 찾지 못하면 호스트를 그대로 쓴다.
    fn window_app(&mut self, hwnd: HWND) -> Option<AppIdentity> {
        let host_pid = window_pid(hwnd)?;
        let host_path = image_path(host_pid)?;
        let (pid, path) = if is_frame_host(file_name(&host_path)) {
            hosted_app_pid(hwnd, host_pid)
                .and_then(|pid| Some((pid, image_path(pid)?)))
                .unwrap_or((host_pid, host_path))
        } else {
            (host_pid, host_path)
        };
        if let Some(app) = self.apps.get(pid, &path) {
            return Some(app.clone());
        }
        let app = identity_from_path(&path, file_description(&path).as_deref());
        self.apps.insert(pid, app.clone());
        Some(app)
    }
}

fn foreground_app(resolver: &mut Resolver) -> Option<AppIdentity> {
    // 안전: 인자 없이 포그라운드 창 핸들만 돌려준다. 포커스가 옮겨 가는 중이면 NULL이고 window_app이 거른다.
    let hwnd = unsafe { GetForegroundWindow() };
    resolver.window_app(hwnd)
}

/// 창을 만든 프로세스의 ID. 창이 없거나 이미 사라졌으면 None.
fn window_pid(hwnd: HWND) -> Option<u32> {
    if hwnd.is_invalid() {
        return None;
    }
    let mut pid = 0;
    // 안전: pid는 이 스택의 u32다. 창이 사라졌으면 함수가 0을 돌려주고 pid도 0으로 남는다.
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
    (pid != 0).then_some(pid)
}

/// `hosted_app_pid`가 `EnumChildWindows` 콜백과 주고받는 상태.
struct HostedSearch {
    host_pid: u32,
    found: Option<u32>,
}

/// 프레임 호스트 창의 자식(손자 포함) 중 호스트가 아닌 프로세스가 만든 첫 창(UWP 앱의 CoreWindow)의 PID.
/// 앱이 막 뜨는 중이거나 일시 중단되어 자식 창이 아직 붙어 있지 않으면 None.
fn hosted_app_pid(frame: HWND, host_pid: u32) -> Option<u32> {
    let mut search = HostedSearch {
        host_pid,
        found: None,
    };
    // 안전: EnumChildWindows는 돌아오기 전에만 콜백을 부르므로, 콜백에 넘긴 search 포인터는 그동안 유효하고 다른 참조가 없다.
    let _ = unsafe {
        EnumChildWindows(
            Some(frame),
            Some(find_hosted_app),
            LPARAM(ptr::from_mut(&mut search) as isize),
        )
    };
    search.found
}

unsafe extern "system" fn find_hosted_app(child: HWND, lparam: LPARAM) -> BOOL {
    // 안전: lparam은 hosted_app_pid가 EnumChildWindows 동안 빌려준 HostedSearch를 가리킨다.
    let search = unsafe { &mut *(lparam.0 as *mut HostedSearch) };
    match window_pid(child) {
        Some(pid) if pid != search.host_pid => {
            search.found = Some(pid);
            // 찾았으므로 열거를 멈춘다.
            FALSE
        }
        _ => TRUE,
    }
}

/// `OpenProcess`로 연 프로세스 핸들. drop에서 닫는다.
struct ProcessHandle(HANDLE);

impl Drop for ProcessHandle {
    fn drop(&mut self) {
        // 안전: OpenProcess가 돌려준 핸들을 이 값만 소유하므로 정확히 한 번 닫는다.
        let _ = unsafe { CloseHandle(self.0) };
    }
}

/// 프로세스 실행 파일의 Win32 전체 경로. 열 수 없는 프로세스(System 등 보호된 프로세스)거나 이미 끝났으면 None.
fn image_path(pid: u32) -> Option<String> {
    // 안전: 상속하지 않는 조회 전용 권한으로 PID만 넘긴다. 성공하면 핸들은 ProcessHandle이 소유한다.
    let process = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) };
    let process = ProcessHandle(process.ok()?);
    let mut buffer = vec![0u16; IMAGE_PATH_CAPACITY];
    let mut len = IMAGE_PATH_CAPACITY as u32;
    // 안전: buffer는 len개 u16을 담을 수 있다. 성공하면 len에 NUL을 뺀 글자 수가 들어온다.
    unsafe {
        QueryFullProcessImageNameW(
            process.0,
            PROCESS_NAME_WIN32,
            PWSTR(buffer.as_mut_ptr()),
            &mut len,
        )
    }
    .ok()?;
    let path = String::from_utf16_lossy(buffer.get(..len as usize)?);
    (!path.is_empty()).then_some(path)
}

/// 실행 파일 버전 리소스의 FileDescription. `\VarFileInfo\Translation` 첫 항목(언어·코드 페이지)의 값만 본다.
/// 버전 리소스가 없거나 그 번역에 FileDescription이 없으면 None. 공백만 있는 값은 `identity_from_path`가 거른다.
fn file_description(path: &str) -> Option<String> {
    let wide_path = to_wide(path);
    let file = PCWSTR(wide_path.as_ptr());
    // 안전: file은 이 함수가 끝날 때까지 살아 있는 NUL 종료 UTF-16 경로다. 두 번째 인자는 쓰지 않는 출력이라 NULL이다.
    let size = unsafe { GetFileVersionInfoSizeW(file, None) };
    if size == 0 {
        return None;
    }
    // u16 배열로 잡아 블록 안의 UTF-16 값을 정렬된 위치에서 읽는다.
    let mut block = vec![0u16; (size as usize).div_ceil(size_of::<u16>())];
    // 안전: block은 size 바이트 이상이고, 함수는 size 바이트까지만 쓴다. 두 번째 인자는 무시된다.
    unsafe { GetFileVersionInfoW(file, None, size, block.as_mut_ptr().cast()) }.ok()?;
    // Translation 값은 (언어 u16, 코드 페이지 u16) 쌍의 배열이고, 길이는 바이트 단위다.
    let (value, bytes) = query_value(&block, w!("\\VarFileInfo\\Translation"))?;
    let &[lang, code_page, ..] = units_at(&block, value, bytes / size_of::<u16>())? else {
        return None;
    };
    let query = to_wide(&file_description_query(lang, code_page));
    // 문자열 값의 길이는 글자(u16) 단위이고 끝의 NUL이 들어 있을 수 있어 from_wide가 NUL 앞에서 자른다.
    let (value, chars) = query_value(&block, PCWSTR(query.as_ptr()))?;
    Some(from_wide(units_at(&block, value, chars)?))
}

/// 버전 블록에서 하위 블록 값을 찾아 블록 안의 주소와 길이를 돌려준다. 길이 단위는 값 종류마다 다르다.
fn query_value(block: &[u16], sub_block: PCWSTR) -> Option<(*const c_void, usize)> {
    let mut value = ptr::null_mut();
    let mut len = 0u32;
    // 찾으면 value는 block 안을 가리킨다. 호출자는 units_at으로 범위를 다시 확인하고 block이 살아 있는 동안만 읽는다.
    // 안전: block은 GetFileVersionInfoW가 채운 버전 블록이고 sub_block은 NUL로 끝나는 문자열이다.
    let found = unsafe { VerQueryValueW(block.as_ptr().cast(), sub_block, &mut value, &mut len) };
    (found.as_bool() && !value.is_null()).then_some((value.cast_const(), len as usize))
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};

    use super::*;

    /// 훅 시작·정지는 전역 상태를 쓰므로 그런 테스트끼리는 하나씩 돌린다.
    static SERIAL: Mutex<()> = Mutex::new(());

    const A: u32 = 0x41;
    const VK_MENU: u32 = 0x12;
    const VK_LSHIFT: u32 = 0xA0;

    fn ignore(_app: Option<AppIdentity>) {}

    /// 콜백 상태(SINK·FILTER·RESOLVER)는 스레드 로컬이므로, 훅 스레드처럼 새 스레드에서 돌린다.
    /// 그 스레드의 패닉은 그대로 이 테스트의 실패로 넘긴다.
    fn on_fresh_thread(test: impl FnOnce() + Send + 'static) {
        if let Err(panic) = thread::spawn(test).join() {
            std::panic::resume_unwind(panic);
        }
    }

    /// 지금 스레드에 훅 스레드와 같은 콜백 대상을 채운다. `on_fresh_thread` 안에서만 부른다.
    fn install_sink(on_keydown: OnKeydown, app: Option<AppIdentity>) -> AppCache {
        let cache: AppCache = Arc::new(Mutex::new(app));
        let installed = SINK.with(|sink| {
            sink.set(Sink {
                on_keydown,
                cache: Arc::clone(&cache),
            })
            .is_ok()
        });
        assert!(installed);
        cache
    }

    fn sample_app() -> AppIdentity {
        identity_from_path(r"C:\Tools\Sample.exe", None)
    }

    #[test]
    fn 처음_눌린_키다운만_세고_keyup_뒤에_다시_센다() {
        let mut filter = RepeatFilter::new(REPEAT_TTL);
        let now = Instant::now();
        assert!(key_counts(&mut filter, WM_KEYDOWN, A, now));
        assert!(!key_counts(&mut filter, WM_KEYDOWN, A, now));
        assert!(!key_counts(&mut filter, WM_KEYUP, A, now));
        assert!(key_counts(&mut filter, WM_KEYDOWN, A, now));
    }

    #[test]
    fn alt와_함께_누른_키도_같은_규칙으로_센다() {
        let mut filter = RepeatFilter::new(REPEAT_TTL);
        let now = Instant::now();
        assert!(key_counts(&mut filter, WM_SYSKEYDOWN, A, now));
        assert!(!key_counts(&mut filter, WM_SYSKEYDOWN, A, now));
        assert!(!key_counts(&mut filter, WM_SYSKEYUP, A, now));
        assert!(key_counts(&mut filter, WM_SYSKEYDOWN, A, now));
    }

    #[test]
    fn 수식키와_키_메시지가_아닌_것은_세지_않는다() {
        let mut filter = RepeatFilter::new(REPEAT_TTL);
        let now = Instant::now();
        assert!(!key_counts(&mut filter, WM_KEYDOWN, VK_LSHIFT, now));
        assert!(!key_counts(&mut filter, WM_SYSKEYDOWN, VK_MENU, now));
        assert!(!key_counts(&mut filter, WM_USER, A, now));
        assert!(key_counts(&mut filter, WM_KEYDOWN, A, now));
    }

    static KEYDOWNS: AtomicUsize = AtomicUsize::new(0);
    static OTHER_APPS: AtomicUsize = AtomicUsize::new(0);

    /// extern "system" 콜백 안에서 패닉하면 테스트 프로세스가 통째로 죽으므로 단언하지 않고 세기만 한다.
    fn count_keydown(app: Option<AppIdentity>) {
        let counter = if app == Some(sample_app()) {
            &KEYDOWNS
        } else {
            &OTHER_APPS
        };
        counter.fetch_add(1, Ordering::SeqCst);
    }

    #[test]
    fn 키보드_콜백은_세어야_할_키다운에만_캐시된_앱을_넘긴다() {
        on_fresh_thread(|| {
            install_sink(count_keydown, Some(sample_app()));
            let key = KBDLLHOOKSTRUCT {
                vkCode: A,
                ..Default::default()
            };
            let lparam = LPARAM(ptr::from_ref(&key) as isize);
            let message = |id: u32| WPARAM(id as usize);
            // 안전: lparam은 이 스택의 KBDLLHOOKSTRUCT를 가리키고, 훅 밖에서 부른 CallNextHookEx는 0을 돌려줄 뿐이다.
            unsafe {
                keyboard_proc(0, message(WM_KEYDOWN), lparam);
                keyboard_proc(0, message(WM_KEYDOWN), lparam);
                keyboard_proc(0, message(WM_KEYUP), lparam);
                keyboard_proc(0, message(WM_KEYDOWN), lparam);
                // code가 음수면 lparam을 읽지 않아야 한다. 읽으면 NULL 역참조로 죽는다.
                keyboard_proc(-1, message(WM_KEYDOWN), LPARAM(0));
            }
            assert_eq!(KEYDOWNS.load(Ordering::SeqCst), 2);
            assert_eq!(OTHER_APPS.load(Ordering::SeqCst), 0);
        });
    }

    #[test]
    fn 포그라운드_콜백은_포그라운드_변경만_캐시에_반영한다() {
        on_fresh_thread(|| {
            let cache = install_sink(ignore, Some(sample_app()));
            // 안전: 인자 없이 포그라운드 창 핸들만 돌려준다.
            let hwnd = unsafe { GetForegroundWindow() };
            let call = |event: u32, hwnd: HWND| {
                // 안전: 시스템이 넘기는 것과 같은 모양의 인자이고, 콜백은 hwnd를 조회에만 쓴다.
                unsafe { foreground_proc(HWINEVENTHOOK::default(), event, hwnd, 0, 0, 0, 0) }
            };
            call(EVENT_SYSTEM_FOREGROUND + 1, hwnd);
            call(EVENT_SYSTEM_FOREGROUND, HWND::default());
            assert_eq!(*lock(&cache), Some(sample_app()));
            // GUI 세션이 없으면(CI 등) 포그라운드 창이 없을 수 있다. 그때는 캐시를 바꾸지 않는지만 본다.
            call(EVENT_SYSTEM_FOREGROUND, hwnd);
            if hwnd.is_invalid() {
                assert_eq!(*lock(&cache), Some(sample_app()));
            } else {
                assert_eq!(*lock(&cache), Resolver::default().window_app(hwnd));
            }
        });
    }

    #[test]
    fn 자기_프로세스의_실행_파일_경로를_읽는다() {
        let path = image_path(std::process::id()).expect("실행 파일 경로");
        let exe = std::env::current_exe().expect("현재 실행 파일");
        let exe_name = exe.file_name().expect("파일 이름").to_string_lossy();
        assert!(file_name(&path).eq_ignore_ascii_case(&exe_name));
    }

    #[test]
    fn 시스템_dll의_file_description을_읽고_없는_파일은_모른다() {
        let root = std::env::var("SystemRoot").unwrap_or_else(|_| r"C:\Windows".into());
        let description = file_description(&format!(r"{root}\System32\kernel32.dll"));
        assert!(description.is_some_and(|description| !description.trim().is_empty()));
        assert_eq!(file_description(r"C:\없는\경로\없는.exe"), None);
    }

    #[test]
    fn 창이_없으면_활성_앱을_모른다() {
        assert_eq!(Resolver::default().window_app(HWND::default()), None);
        assert_eq!(hosted_app_pid(HWND::default(), 0), None);
    }

    #[test]
    fn 권한이_필요_없다() {
        assert_eq!(permission_status(), PermissionStatus::NotRequired);
        request_permission();
    }

    /// GUI 세션이 없으면(CI 등) 포그라운드 창이 없을 수 있으므로 `None`도 허용한다.
    #[test]
    fn 시작_전에도_포그라운드_앱을_조회한다() {
        let _serial = lock(&SERIAL);
        if let Some(app) = current_app() {
            assert_eq!(app.id, app.path.to_lowercase());
            assert!(!app.name.is_empty());
        }
    }

    #[test]
    fn 시작_전_정지는_아무것도_하지_않는다() {
        let _serial = lock(&SERIAL);
        stop();
        stop();
        assert!(lock(&HOOK).is_none());
    }

    #[test]
    fn 시작하고_정지한_뒤_다시_시작할_수_있다() {
        let _serial = lock(&SERIAL);
        for _ in 0..2 {
            start(ignore).expect("훅 설치");
            // 이미 돌고 있으면 멈추고 새로 건다.
            start(ignore).expect("훅 재설치");
            assert!(lock(&HOOK).is_some());
            if let Some(app) = current_app() {
                assert_eq!(app.id, app.path.to_lowercase());
            }
            stop();
            assert!(lock(&HOOK).is_none());
        }
    }
}
