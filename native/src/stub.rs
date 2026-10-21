//! 키보드 훅이 없는 플랫폼용 구현. 이벤트를 보내지 않고 권한도 필요 없다고 답한다.

use napi::Result;

use crate::{AppIdentity, OnKeydown, PermissionStatus};

pub fn start(_on_keydown: OnKeydown) -> Result<()> {
    Ok(())
}

pub fn stop() {}

pub fn permission_status() -> PermissionStatus {
    PermissionStatus::NotRequired
}

pub fn request_permission() {}

pub fn current_app() -> Option<AppIdentity> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ignore(_app: Option<AppIdentity>) {}

    #[test]
    fn 권한이_필요_없고_활성_앱을_모른다() {
        assert_eq!(permission_status(), PermissionStatus::NotRequired);
        assert_eq!(current_app(), None);
    }

    #[test]
    fn 시작과_정지가_실패하지_않는다() {
        assert!(start(ignore).is_ok());
        request_permission();
        stop();
    }
}
