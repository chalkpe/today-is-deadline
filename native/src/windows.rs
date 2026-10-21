//! Windows 구현 자리. Task 18에서 WH_KEYBOARD_LL과 SetWinEventHook 캐시로 바뀌기 전까지는 스텁을 그대로 쓴다.

#[path = "stub.rs"]
mod stub;

pub use stub::*;
