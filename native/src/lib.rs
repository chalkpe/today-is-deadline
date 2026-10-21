//! Electron main 프로세스에 "어느 앱에서 세어야 할 키다운이 1회 있었다"만 올려 보내는 Node-API 애드온.
//!
//! 키코드는 플랫폼 훅 콜백 안에서 반복·수식키 판정에만 쓰고, 이 크레이트의 어떤 공개 타입에도 담지 않는다.
//! 훅이 바깥으로 내보낼 수 있는 값은 `OnKeydown`이 받는 `Option<AppIdentity>`뿐이다.

use std::sync::{Mutex, MutexGuard, PoisonError};

use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;

pub mod filter;

#[cfg(target_os = "macos")]
mod macos;
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod stub;
#[cfg(target_os = "windows")]
mod windows;
/// Windows 활성 앱 식별 규칙 중 Win32 없이 정해지는 부분. 표준 라이브러리만 쓰므로 다른 OS에서도 테스트를 돌린다.
#[cfg(all(test, not(target_os = "windows")))]
#[path = "windows/identity.rs"]
mod windows_identity;

#[cfg(target_os = "macos")]
use macos as platform;
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
use stub as platform;
#[cfg(target_os = "windows")]
use windows as platform;

#[napi(object)]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AppIdentity {
    pub id: String,
    pub name: String,
    pub path: String,
}

/// 입력 모니터링 권한 상태. JS에는 문자열 리터럴로 나간다(`src/shared/ipc`의 `PermissionStatus`와 같은 값).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PermissionStatus {
    Granted,
    Denied,
    NotRequired,
}

impl PermissionStatus {
    fn as_str(self) -> &'static str {
        match self {
            Self::Granted => "granted",
            Self::Denied => "denied",
            Self::NotRequired => "not-required",
        }
    }
}

/// 플랫폼 훅이 세어야 할 keyDown 1회마다 부르는 함수. 활성 앱을 모르면 `None`을 넘긴다.
pub type OnKeydown = fn(Option<AppIdentity>);

type KeydownCallback =
    ThreadsafeFunction<Option<AppIdentity>, (), Option<AppIdentity>, Status, false>;

static KEYDOWN_CALLBACK: Mutex<Option<KeydownCallback>> = Mutex::new(None);

fn keydown_callback() -> MutexGuard<'static, Option<KeydownCallback>> {
    KEYDOWN_CALLBACK
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
}

fn emit_keydown(app: Option<AppIdentity>) {
    if let Some(callback) = keydown_callback().as_ref() {
        callback.call(app, ThreadsafeFunctionCallMode::NonBlocking);
    }
}

/// 이미 시작한 훅이 있으면 멈추고 새 콜백으로 다시 시작한다.
#[napi(ts_args_type = "callback: (app: AppIdentity | null) => void")]
pub fn start(callback: KeydownCallback) -> Result<()> {
    platform::stop();
    *keydown_callback() = Some(callback);
    platform::start(emit_keydown).inspect_err(|_| {
        keydown_callback().take();
    })
}

#[napi]
pub fn stop() {
    platform::stop();
    keydown_callback().take();
}

#[napi(ts_return_type = "'granted' | 'denied' | 'not-required'")]
pub fn permission_status() -> &'static str {
    platform::permission_status().as_str()
}

#[napi]
pub fn request_permission() {
    platform::request_permission()
}

#[napi]
pub fn current_app() -> Option<AppIdentity> {
    platform::current_app()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 키로깅 방지 보장(스펙 5.4): JS로 나가는 타입에 키코드 같은 필드가 하나라도 늘면 이 구조 분해가 컴파일되지 않는다.
    #[test]
    fn app_identity에는_앱_식별_필드만_있다() {
        let app = AppIdentity {
            id: "com.apple.Terminal".into(),
            name: "터미널".into(),
            path: "/System/Applications/Utilities/Terminal.app".into(),
        };
        let AppIdentity { id, name, path } = app;
        assert_eq!(
            (id.as_str(), name.as_str(), path.as_str()),
            (
                "com.apple.Terminal",
                "터미널",
                "/System/Applications/Utilities/Terminal.app"
            )
        );
    }

    /// 훅이 바깥으로 넘길 수 있는 값은 `Option<AppIdentity>` 하나뿐이다. 인자가 늘면 컴파일되지 않는다.
    #[test]
    fn keydown_통로는_활성_앱만_넘긴다() {
        let on_keydown: OnKeydown = emit_keydown;
        let _: fn(Option<AppIdentity>) = on_keydown;
    }

    #[test]
    fn 권한_상태는_js_문자열_계약으로_나간다() {
        assert_eq!(PermissionStatus::Granted.as_str(), "granted");
        assert_eq!(PermissionStatus::Denied.as_str(), "denied");
        assert_eq!(PermissionStatus::NotRequired.as_str(), "not-required");
    }

    #[test]
    fn 콜백이_없으면_keydown을_버린다() {
        emit_keydown(None);
        assert!(keydown_callback().is_none());
    }
}
