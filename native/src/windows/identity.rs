//! 활성 앱 식별 규칙 중 Win32 호출 없이 정해지는 부분: 경로 해석, 버전 리소스 질의 문자열, PID 캐시.
//!
//! 표준 라이브러리만 쓴다. 경로 구분자는 `\`와 `/`를 모두 받으므로 어느 OS에서 돌려도 결과가 같다.

use std::collections::HashMap;
use std::ffi::c_void;

use crate::AppIdentity;

/// UWP 앱 창을 감싸는 호스트 프로세스의 실행 파일 이름. 포그라운드 창이 이 프로세스면 자식 창에서 실제 앱을 찾는다.
const FRAME_HOST: &str = "applicationframehost.exe";

/// PID 캐시에 둘 최대 항목 수. 이보다 커지려 하면 비워서 끝난 프로세스의 항목이 쌓이지 않게 한다.
pub const MAX_CACHED_APPS: usize = 256;

/// 경로의 마지막 요소(실행 파일 이름).
pub fn file_name(path: &str) -> &str {
    path.rfind(['\\', '/'])
        .map_or(path, |slash| &path[slash + 1..])
}

/// 확장자를 뗀 실행 파일 이름. 확장자가 없거나 `.`으로 시작하는 이름은 그대로 둔다.
pub fn file_stem(path: &str) -> &str {
    let name = file_name(path);
    match name.rfind('.') {
        None | Some(0) => name,
        Some(dot) => &name[..dot],
    }
}

/// 실행 파일 이름이 UWP 프레임 호스트인지. Windows 파일 이름은 대소문자를 가리지 않는다.
pub fn is_frame_host(exe_name: &str) -> bool {
    exe_name.eq_ignore_ascii_case(FRAME_HOST)
}

/// `VerQueryValueW`로 FileDescription을 읽을 하위 블록 경로.
/// 언어·코드 페이지는 `\VarFileInfo\Translation`의 첫 항목이고, 각각 4자리 16진수로 붙여 쓴다.
pub fn file_description_query(lang: u16, code_page: u16) -> String {
    format!("\\StringFileInfo\\{lang:04x}{code_page:04x}\\FileDescription")
}

/// id는 실행 파일 이름(확장자 포함)을 소문자로 바꾼 값이다. Squirrel로 설치한 앱이나 Store 앱은 업데이트할 때마다
/// 설치 경로(버전 폴더)가 바뀌므로, 경로가 아니라 이름으로 묶어야 통계가 버전마다 갈라지지 않는다.
/// 소문자로 바꾸는 까닭은 Windows 파일 이름이 대소문자를 가리지 않기 때문이다.
/// path는 전체 경로 그대로(아이콘 추출용) 두고, name은 FileDescription(앞뒤 공백 제거, 비면 없는 값) → 확장자를 뗀
/// exe 이름 순으로 고른다.
pub fn identity_from_path(path: &str, description: Option<&str>) -> AppIdentity {
    let name = description
        .map(str::trim)
        .filter(|description| !description.is_empty())
        .unwrap_or_else(|| file_stem(path));
    AppIdentity {
        id: file_name(path).to_lowercase(),
        name: name.to_owned(),
        path: path.to_owned(),
    }
}

/// NUL로 끝나는 UTF-16 문자열. Win32 W 함수의 문자열 인자로 넘긴다.
pub fn to_wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(Some(0)).collect()
}

/// 첫 NUL 앞까지를 문자열로 읽는다. 짝이 맞지 않는 서로게이트는 U+FFFD로 바꾼다.
pub fn from_wide(units: &[u16]) -> String {
    let end = units
        .iter()
        .position(|&unit| unit == 0)
        .unwrap_or(units.len());
    String::from_utf16_lossy(&units[..end])
}

/// `VerQueryValueW`가 돌려준 포인터가 `block` 안의 u16 경계를 가리키면, 거기서부터 `len`개(블록 끝에서 자름)를
/// 안전한 슬라이스로 돌려준다. 블록 밖이거나 경계가 어긋나면 `None`이다. 포인터를 역참조하지 않고 주소만 비교한다.
pub fn units_at(block: &[u16], value: *const c_void, len: usize) -> Option<&[u16]> {
    let offset = value.addr().checked_sub(block.as_ptr().addr())?;
    if offset % size_of::<u16>() != 0 {
        return None;
    }
    let start = offset / size_of::<u16>();
    if start >= block.len() {
        return None;
    }
    let end = start.saturating_add(len).min(block.len());
    Some(&block[start..end])
}

/// PID별로 식별한 앱. 끝난 프로세스의 PID는 재사용되므로, 지금 그 PID의 실행 파일 경로가 저장한 경로와 같을 때만 적중으로 본다.
#[derive(Default)]
pub struct PidCache {
    apps: HashMap<u32, AppIdentity>,
}

impl PidCache {
    pub fn get(&self, pid: u32, path: &str) -> Option<&AppIdentity> {
        self.apps.get(&pid).filter(|app| app.path == path)
    }

    /// 새 PID를 넣으면 `MAX_CACHED_APPS`를 넘게 되는 경우 먼저 전부 비운다.
    pub fn insert(&mut self, pid: u32, app: AppIdentity) {
        if self.apps.len() >= MAX_CACHED_APPS && !self.apps.contains_key(&pid) {
            self.apps.clear();
        }
        self.apps.insert(pid, app);
    }

    #[cfg(test)]
    fn len(&self) -> usize {
        self.apps.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOTEPAD: &str = r"C:\Windows\System32\Notepad.EXE";
    const EXPLORER: &str = r"C:\Windows\explorer.exe";

    fn app(path: &str) -> AppIdentity {
        identity_from_path(path, None)
    }

    #[test]
    fn id는_exe_이름_소문자이고_path는_경로_그대로다() {
        assert_eq!(
            identity_from_path(NOTEPAD, Some("메모장")),
            AppIdentity {
                id: "notepad.exe".into(),
                name: "메모장".into(),
                path: NOTEPAD.into(),
            }
        );
    }

    #[test]
    fn 업데이트로_설치_경로가_바뀌어도_id는_같다() {
        let old = identity_from_path(
            r"C:\Users\me\AppData\Local\Discord\app-1.0.9001\Discord.exe",
            Some("Discord"),
        );
        let new = identity_from_path(
            r"C:\Users\me\AppData\Local\Discord\app-1.0.9002\Discord.exe",
            Some("Discord"),
        );
        assert_eq!(old.id, "discord.exe");
        assert_eq!(old.id, new.id);
        assert_ne!(old.path, new.path);
    }

    #[test]
    fn 설명이_없거나_비면_확장자를_뗀_exe_이름을_쓴다() {
        assert_eq!(identity_from_path(NOTEPAD, None).name, "Notepad");
        assert_eq!(identity_from_path(NOTEPAD, Some("")).name, "Notepad");
        assert_eq!(identity_from_path(NOTEPAD, Some("  \t")).name, "Notepad");
    }

    #[test]
    fn 설명의_앞뒤_공백은_뗀다() {
        assert_eq!(
            identity_from_path(NOTEPAD, Some("  Windows 메모장 ")).name,
            "Windows 메모장"
        );
    }

    #[test]
    fn 경로에서_파일_이름과_확장자_없는_이름을_뗀다() {
        assert_eq!(file_name(NOTEPAD), "Notepad.EXE");
        assert_eq!(file_name("C:/tools/a.b/run.exe"), "run.exe");
        assert_eq!(file_name("run.exe"), "run.exe");
        assert_eq!(file_stem(r"C:\tools\v1.2\tool"), "tool");
        assert_eq!(file_stem(r"C:\tools\archive.tar.gz"), "archive.tar");
        assert_eq!(file_stem(r"C:\tools\.hidden"), ".hidden");
    }

    #[test]
    fn 프레임_호스트는_대소문자만_무시하고_이름이_같아야_한다() {
        assert!(is_frame_host("ApplicationFrameHost.exe"));
        assert!(is_frame_host("APPLICATIONFRAMEHOST.EXE"));
        assert!(!is_frame_host("ApplicationFrameHost"));
        assert!(!is_frame_host("explorer.exe"));
        assert!(!is_frame_host(file_name(NOTEPAD)));
    }

    #[test]
    fn 첫_번역_항목으로_file_description_경로를_만든다() {
        assert_eq!(
            file_description_query(0x0412, 0x04b0),
            r"\StringFileInfo\041204b0\FileDescription"
        );
        assert_eq!(
            file_description_query(0x0409, 0x04E4),
            r"\StringFileInfo\040904e4\FileDescription"
        );
        assert_eq!(
            file_description_query(0, 0),
            r"\StringFileInfo\00000000\FileDescription"
        );
    }

    #[test]
    fn utf16_문자열을_nul로_끝내고_nul_앞까지_읽는다() {
        let wide = to_wide("메모장");
        assert_eq!(wide.last(), Some(&0));
        assert_eq!(from_wide(&wide), "메모장");
        assert_eq!(from_wide(&[0x41, 0x42]), "AB");
        assert_eq!(from_wide(&[0x41, 0, 0x42]), "A");
        assert_eq!(from_wide(&[]), "");
    }

    #[test]
    fn 블록_안을_가리키는_값만_슬라이스로_읽는다() {
        let block: Vec<u16> = (0..8).collect();
        let at = |index: usize| block[index..].as_ptr().cast::<c_void>();
        assert_eq!(units_at(&block, at(2), 3), Some(&block[2..5]));
        assert_eq!(units_at(&block, at(0), 0), Some(&block[0..0]));
        // 블록 끝을 넘는 길이는 끝에서 자른다.
        assert_eq!(units_at(&block, at(6), 10), Some(&block[6..8]));
        // 블록 앞이나 끝을 가리키면 읽지 않는다.
        let before = block.as_ptr().wrapping_sub(1).cast::<c_void>();
        assert_eq!(units_at(&block, before, 1), None);
        let end = block.as_ptr().wrapping_add(block.len()).cast::<c_void>();
        assert_eq!(units_at(&block, end, 1), None);
        // u16 경계가 아니면 읽지 않는다.
        let odd = block.as_ptr().cast::<u8>().wrapping_add(1).cast::<c_void>();
        assert_eq!(units_at(&block, odd, 1), None);
    }

    #[test]
    fn pid_캐시는_경로가_같을_때만_적중한다() {
        let mut cache = PidCache::default();
        cache.insert(42, app(NOTEPAD));
        assert_eq!(cache.get(42, NOTEPAD), Some(&app(NOTEPAD)));
        assert_eq!(cache.get(42, EXPLORER), None);
        assert_eq!(cache.get(7, NOTEPAD), None);
        cache.insert(42, app(EXPLORER));
        assert_eq!(cache.get(42, NOTEPAD), None);
        assert_eq!(cache.get(42, EXPLORER), Some(&app(EXPLORER)));
        assert_eq!(cache.len(), 1);
    }

    #[test]
    fn pid_캐시는_가득_찬_뒤_새_pid가_오면_비운다() {
        let mut cache = PidCache::default();
        let full = MAX_CACHED_APPS as u32;
        for pid in 0..full {
            cache.insert(pid, app(NOTEPAD));
        }
        assert_eq!(cache.len(), MAX_CACHED_APPS);
        // 이미 있는 PID를 갱신하면 비우지 않는다.
        cache.insert(0, app(EXPLORER));
        assert_eq!(cache.len(), MAX_CACHED_APPS);
        cache.insert(full, app(NOTEPAD));
        assert_eq!(cache.len(), 1);
        assert!(cache.get(full, NOTEPAD).is_some());
    }
}
