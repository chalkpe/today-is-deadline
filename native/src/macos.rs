//! macOS 구현. 전용 스레드의 CGEventTap(session, head-insert, listen-only, keyDown만)으로 키다운을 받고,
//! NSWorkspace 활성화 알림으로 갱신하는 활성 앱 캐시를 그대로 `on_keydown`에 넘긴다.
//!
//! 이벤트에서 읽는 값은 이벤트 종류와 `kCGKeyboardEventAutorepeat`뿐이다. 키코드 필드는 읽지 않는다.
//! 수식키만 누르면 keyDown이 아니라 flagsChanged가 오므로 마스크에서 이미 빠진다.

use std::cell::RefCell;
use std::path::Path;
use std::ptr::NonNull;
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, SyncSender};
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use block2::RcBlock;
use core_foundation::runloop::{kCFRunLoopDefaultMode, CFRunLoop};
use core_graphics::event::{
    CGEvent, CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement, CGEventType,
    CallbackResult, EventField,
};
use napi::{Error, Result};
use objc2::rc::{autoreleasepool, Retained};
use objc2::runtime::{NSObjectProtocol, ProtocolObject};
use objc2_app_kit::{
    NSRunningApplication, NSWorkspace, NSWorkspaceApplicationKey,
    NSWorkspaceDidActivateApplicationNotification,
};
use objc2_foundation::{NSNotification, NSNotificationCenter};

use crate::{AppIdentity, OnKeydown, PermissionStatus};

const TAP_FAILED: &str = "입력 모니터링 권한이 없거나 이벤트 탭을 만들지 못했습니다";

/// 정지 요청을 다시 보내는 간격. run loop에 들어가기 전에 보낸 `CFRunLoopStop`은 사라지기 때문이다.
const STOP_RETRY: Duration = Duration::from_millis(10);

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn CGPreflightListenEventAccess() -> bool;
    fn CGRequestListenEventAccess() -> bool;
}

type AppCache = Arc<Mutex<Option<AppIdentity>>>;

static HOOK: Mutex<Option<Hook>> = Mutex::new(None);

thread_local! {
    /// 탭 스레드가 소유한 이벤트 탭. 시스템이 탭을 끄면 콜백이 여기서 꺼내 다시 켠다.
    static TAP: RefCell<Option<CGEventTap<'static>>> = const { RefCell::new(None) };
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
    // 안전: 인자 없이 이 프로세스의 입력 모니터링 허용 여부만 묻는 함수다.
    if unsafe { CGPreflightListenEventAccess() } {
        PermissionStatus::Granted
    } else {
        PermissionStatus::Denied
    }
}

pub fn request_permission() {
    // 안전: 인자 없이 시스템 권한 요청만 띄우는 함수다. 허용 여부는 permission_status로 다시 묻는다.
    unsafe { CGRequestListenEventAccess() };
}

pub fn current_app() -> Option<AppIdentity> {
    let cache = lock(&HOOK).as_ref().map(|hook| Arc::clone(&hook.cache));
    match cache {
        Some(cache) => lock(&cache).clone(),
        None => frontmost_app(),
    }
}

/// 돌고 있는 탭 스레드와 그 스레드를 멈추는 데 필요한 것들.
struct Hook {
    run_loop: CFRunLoop,
    /// 탭 스레드가 끝나며 송신 쪽을 버리면 `Disconnected`로 깨어난다.
    done: Receiver<Option<CFRunLoop>>,
    thread: JoinHandle<()>,
    cache: AppCache,
}

impl Hook {
    fn spawn(on_keydown: OnKeydown) -> Result<Self> {
        let cache: AppCache = Arc::new(Mutex::new(frontmost_app()));
        let (ready, done) = mpsc::sync_channel(1);
        let tap_cache = Arc::clone(&cache);
        let thread = thread::Builder::new()
            .name("keydown-tap".into())
            .spawn(move || run_tap(on_keydown, tap_cache, ready))
            .map_err(|error| {
                Error::from_reason(format!("키보드 훅 스레드를 만들지 못했습니다: {error}"))
            })?;
        match done.recv() {
            Ok(Some(run_loop)) => Ok(Self {
                run_loop,
                done,
                thread,
                cache,
            }),
            _ => {
                let _ = thread.join();
                Err(Error::from_reason(TAP_FAILED))
            }
        }
    }

    fn stop(self) {
        self.run_loop.stop();
        while let Err(RecvTimeoutError::Timeout) = self.done.recv_timeout(STOP_RETRY) {
            self.run_loop.stop();
        }
        let _ = self.thread.join();
    }
}

/// 탭 스레드 본체. 탭을 만들지 못하면 `None`을, 만들면 이 스레드의 run loop를 `ready`로 알린 뒤
/// `CFRunLoopStop`이 올 때까지 run loop를 돌린다. 끝나면 관찰자를 풀고 탭을 무효화한다.
fn run_tap(on_keydown: OnKeydown, cache: AppCache, ready: SyncSender<Option<CFRunLoop>>) {
    let callback_cache = Arc::clone(&cache);
    let tap = CGEventTap::new(
        CGEventTapLocation::Session,
        CGEventTapPlacement::HeadInsertEventTap,
        CGEventTapOptions::ListenOnly,
        vec![CGEventType::KeyDown],
        move |_proxy, event_type, event| {
            match classify(event_type, event) {
                TapAction::Reenable => TAP.with_borrow(|tap| {
                    if let Some(tap) = tap {
                        tap.enable();
                    }
                }),
                TapAction::Count => on_keydown(lock(&callback_cache).clone()),
                TapAction::Skip => {}
            }
            CallbackResult::Keep
        },
    );
    let Some((tap, source)) = tap.ok().and_then(|tap| {
        let source = tap.mach_port().create_runloop_source(0).ok()?;
        Some((tap, source))
    }) else {
        let _ = ready.send(None);
        return;
    };

    let run_loop = CFRunLoop::get_current();
    // 안전: kCFRunLoopDefaultMode는 CoreFoundation이 내보내는 불변 전역 상수다.
    let mode = unsafe { kCFRunLoopDefaultMode };
    run_loop.add_source(&source, mode);
    tap.enable();
    TAP.set(Some(tap));
    let observer = ActivationObserver::register(cache);

    if ready.send(Some(run_loop.clone())).is_ok() {
        CFRunLoop::run_current();
    }

    drop(observer);
    run_loop.remove_source(&source, mode);
    TAP.take();
}

/// 탭 콜백이 이벤트 하나로 할 일.
#[derive(Debug, PartialEq, Eq)]
enum TapAction {
    /// 시스템이 탭을 껐다(타임아웃·사용자 입력). 다시 켜고 넘어간다.
    Reenable,
    /// 세지 않는다(자동 반복 keyDown 등).
    Skip,
    /// 키다운 1회로 센다.
    Count,
}

fn classify(event_type: CGEventType, event: &CGEvent) -> TapAction {
    match event_type {
        CGEventType::TapDisabledByTimeout | CGEventType::TapDisabledByUserInput => {
            TapAction::Reenable
        }
        CGEventType::KeyDown
            if event.get_integer_value_field(EventField::KEYBOARD_EVENT_AUTOREPEAT) == 0 =>
        {
            TapAction::Count
        }
        _ => TapAction::Skip,
    }
}

/// `NSWorkspaceDidActivateApplicationNotification`을 받아 활성 앱 캐시를 갱신하는 관찰자. drop하면 등록을 푼다.
struct ActivationObserver {
    center: Retained<NSNotificationCenter>,
    token: Retained<ProtocolObject<dyn NSObjectProtocol>>,
}

impl ActivationObserver {
    fn register(cache: AppCache) -> Self {
        let center = NSWorkspace::sharedWorkspace().notificationCenter();
        let block = RcBlock::new(move |notification: NonNull<NSNotification>| {
            // 안전: 알림 센터는 블록을 부르는 동안 알림 객체를 붙잡고 있다.
            let notification = unsafe { notification.as_ref() };
            let app = autoreleasepool(|_| activated_app(notification));
            *lock(&cache) = app;
        });
        // 안전: 이름은 AppKit 상수이고, 블록은 Send·Sync인 캐시만 붙잡으므로 알림을 보낸 스레드(큐 없음)에서 불러도 된다.
        let token = unsafe {
            center.addObserverForName_object_queue_usingBlock(
                Some(NSWorkspaceDidActivateApplicationNotification),
                None,
                None,
                &block,
            )
        };
        Self { center, token }
    }
}

impl Drop for ActivationObserver {
    fn drop(&mut self) {
        // 안전: token은 이 알림 센터의 addObserverForName이 돌려준 관찰자 객체 그대로다.
        unsafe { self.center.removeObserver(self.token.as_ref()) };
    }
}

/// 알림의 userInfo에 실린 활성화된 앱. 없으면 맨 앞 앱으로 대신한다.
fn activated_app(notification: &NSNotification) -> Option<AppIdentity> {
    // 안전: NSWorkspaceApplicationKey는 AppKit이 내보내는 불변 NSString 상수다.
    let key = unsafe { NSWorkspaceApplicationKey };
    notification
        .userInfo()
        .and_then(|info| info.objectForKey(key))
        .and_then(|object| object.downcast::<NSRunningApplication>().ok())
        .or_else(|| NSWorkspace::sharedWorkspace().frontmostApplication())
        .as_deref()
        .and_then(app_identity)
}

fn frontmost_app() -> Option<AppIdentity> {
    autoreleasepool(|_| {
        NSWorkspace::sharedWorkspace()
            .frontmostApplication()
            .as_deref()
            .and_then(app_identity)
    })
}

fn app_identity(app: &NSRunningApplication) -> Option<AppIdentity> {
    identity_from(
        app.bundleIdentifier().map(|id| id.to_string()),
        app.localizedName().map(|name| name.to_string()),
        app.bundleURL()
            .and_then(|url| url.path())
            .map(|path| path.to_string()),
        app.executableURL()
            .and_then(|url| url.path())
            .map(|path| path.to_string()),
    )
}

/// id는 번들 ID → 실행 파일 경로, path는 번들 경로 → 실행 파일 경로,
/// name은 표시 이름 → path 마지막 요소 → id 순으로 고른다. 빈 문자열은 없는 값으로 본다.
/// id를 정할 수 없으면 활성 앱을 모르는 것으로 본다.
fn identity_from(
    bundle_id: Option<String>,
    localized_name: Option<String>,
    bundle_path: Option<String>,
    executable_path: Option<String>,
) -> Option<AppIdentity> {
    let present = |value: Option<String>| value.filter(|value| !value.is_empty());
    let executable_path = present(executable_path);
    let id = present(bundle_id).or_else(|| executable_path.clone())?;
    let path = present(bundle_path).or(executable_path).unwrap_or_default();
    let name = present(localized_name)
        .or_else(|| {
            Path::new(&path)
                .file_name()
                .map(|name| name.to_string_lossy().into_owned())
        })
        .unwrap_or_else(|| id.clone());
    Some(AppIdentity { id, name, path })
}

#[cfg(test)]
mod tests {
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
    use objc2_foundation::NSDictionary;

    use super::*;

    /// 훅 시작·정지는 전역 상태를 쓰므로 그런 테스트끼리는 하나씩 돌린다.
    static SERIAL: Mutex<()> = Mutex::new(());

    fn ignore(_app: Option<AppIdentity>) {}

    /// 자동 반복 필드만 정한 keyDown 이벤트. 키코드는 0으로 두고 어디서도 읽지 않는다.
    fn key_down(autorepeat: i64) -> CGEvent {
        let source = CGEventSource::new(CGEventSourceStateID::Private).expect("이벤트 소스");
        let event = CGEvent::new_keyboard_event(source, 0, true).expect("키 이벤트");
        event.set_integer_value_field(EventField::KEYBOARD_EVENT_AUTOREPEAT, autorepeat);
        event
    }

    fn some(value: &str) -> Option<String> {
        Some(value.to_owned())
    }

    /// 이 프로세스의 작업 공간 알림 센터에만 활성화 알림을 보낸다. 다른 앱의 포커스는 건드리지 않는다.
    fn post_activation(app: Option<&NSRunningApplication>) {
        // 안전: NSWorkspaceApplicationKey는 AppKit이 내보내는 불변 NSString 상수다.
        let key = unsafe { NSWorkspaceApplicationKey };
        let info = app.map(|app| NSDictionary::from_slices(&[key], &[app]));
        // 안전: userInfo의 키·값은 NSObject라 NSDictionary<AnyObject, AnyObject>로 읽어도 되고, 이름은 AppKit 상수다.
        unsafe {
            NSWorkspace::sharedWorkspace()
                .notificationCenter()
                .postNotificationName_object_userInfo(
                    NSWorkspaceDidActivateApplicationNotification,
                    None,
                    info.as_deref().map(|info| info.cast_unchecked()),
                )
        };
    }

    #[test]
    fn 처음_눌린_keydown만_센다() {
        assert_eq!(
            classify(CGEventType::KeyDown, &key_down(0)),
            TapAction::Count
        );
        assert_eq!(
            classify(CGEventType::KeyDown, &key_down(1)),
            TapAction::Skip
        );
    }

    #[test]
    fn 시스템이_탭을_끄면_다시_켠다() {
        let event = key_down(0);
        assert_eq!(
            classify(CGEventType::TapDisabledByTimeout, &event),
            TapAction::Reenable
        );
        assert_eq!(
            classify(CGEventType::TapDisabledByUserInput, &event),
            TapAction::Reenable
        );
    }

    #[test]
    fn keydown이_아닌_이벤트는_세지_않는다() {
        let event = key_down(0);
        assert_eq!(classify(CGEventType::KeyUp, &event), TapAction::Skip);
        assert_eq!(classify(CGEventType::FlagsChanged, &event), TapAction::Skip);
    }

    #[test]
    fn 번들_앱은_번들_id와_표시_이름과_번들_경로로_식별한다() {
        let app = identity_from(
            some("com.apple.Safari"),
            some("Safari"),
            some("/Applications/Safari.app"),
            some("/Applications/Safari.app/Contents/MacOS/Safari"),
        );
        assert_eq!(
            app,
            Some(AppIdentity {
                id: "com.apple.Safari".into(),
                name: "Safari".into(),
                path: "/Applications/Safari.app".into(),
            })
        );
    }

    #[test]
    fn 번들이_없으면_실행_파일_경로로_식별한다() {
        let app = identity_from(None, None, None, some("/usr/local/bin/kitty"));
        assert_eq!(
            app,
            Some(AppIdentity {
                id: "/usr/local/bin/kitty".into(),
                name: "kitty".into(),
                path: "/usr/local/bin/kitty".into(),
            })
        );
    }

    #[test]
    fn 빈_문자열은_없는_값으로_본다() {
        let app = identity_from(some(""), some(""), some(""), some("/opt/tool"));
        assert_eq!(
            app,
            Some(AppIdentity {
                id: "/opt/tool".into(),
                name: "tool".into(),
                path: "/opt/tool".into(),
            })
        );
    }

    #[test]
    fn 식별할_수_없으면_활성_앱을_모른다() {
        assert_eq!(identity_from(None, some("이름만"), None, None), None);
    }

    #[test]
    fn macos는_권한_상태를_허용이나_거부로만_답한다() {
        assert!(matches!(
            permission_status(),
            PermissionStatus::Granted | PermissionStatus::Denied
        ));
    }

    /// GUI 세션이 없으면(CI 등) 맨 앞 앱이 없을 수 있으므로 `None`도 허용한다.
    #[test]
    fn 시작_전에도_맨_앞_앱을_조회한다() {
        let _serial = lock(&SERIAL);
        if let Some(app) = current_app() {
            assert!(!app.id.is_empty());
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
    fn 권한에_맞게_시작하고_다시_시작해도_멈추지_않는다() {
        let _serial = lock(&SERIAL);
        let granted = permission_status() == PermissionStatus::Granted;
        for _ in 0..2 {
            let started = start(ignore);
            if granted {
                assert!(started.is_ok());
                assert!(current_app().is_some());
            } else {
                assert_eq!(started.unwrap_err().reason, TAP_FAILED);
            }
            stop();
            assert!(lock(&HOOK).is_none());
        }
    }

    #[test]
    fn 활성화_알림으로_캐시를_갱신하고_해제하면_더는_바꾸지_않는다() {
        let _serial = lock(&SERIAL);
        let cache: AppCache = Arc::new(Mutex::new(None));
        let frontmost = frontmost_app();
        let (other, expected) = NSWorkspace::sharedWorkspace()
            .runningApplications()
            .to_vec()
            .into_iter()
            .find_map(|app| {
                let identity =
                    app_identity(&app).filter(|identity| Some(identity) != frontmost.as_ref())?;
                Some((app, identity))
            })
            .expect("맨 앞이 아닌 실행 중인 앱이 있어야 한다");

        let observer = ActivationObserver::register(Arc::clone(&cache));
        post_activation(Some(&other));
        assert_eq!(lock(&cache).as_ref(), Some(&expected));

        *lock(&cache) = None;
        post_activation(None);
        assert!(
            lock(&cache).is_some(),
            "userInfo가 없으면 맨 앞 앱으로 채운다"
        );

        drop(observer);
        *lock(&cache) = None;
        post_activation(Some(&other));
        assert_eq!(*lock(&cache), None);
    }
}
