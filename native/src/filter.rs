//! 플랫폼과 무관한 키다운 필터. 자동 반복과 수식키 단독 입력을 걸러 "세어야 할 키다운"만 남긴다.
//!
//! 키코드는 이 모듈 안에서 판정에만 쓴다. 판정 결과(`bool`)만 돌려주고 키코드를 바깥으로 내보내는 API는 두지 않는다.

use std::collections::HashMap;
use std::time::{Duration, Instant};

/// 떼지 않은 키를 기억해 같은 키의 두 번째 keyDown부터(자동 반복) 거른다.
///
/// keyUp을 놓쳐 키가 영원히 눌린 것으로 남지 않도록, 마지막 keyDown 뒤로 `ttl`이 지난 항목은 만료로 본다.
/// 꾹 누르고 있는 동안에는 반복 keyDown이 시각을 갱신하므로 만료되지 않는다.
pub struct RepeatFilter {
    down: HashMap<u32, Instant>,
    ttl: Duration,
}

impl RepeatFilter {
    pub fn new(ttl: Duration) -> Self {
        Self {
            down: HashMap::new(),
            ttl,
        }
    }

    /// `true`면 세어야 하는 keyDown이다.
    pub fn key_down(&mut self, code: u32, now: Instant) -> bool {
        let fresh = match self.down.get(&code) {
            Some(&last) => now.saturating_duration_since(last) >= self.ttl,
            None => true,
        };
        self.down.insert(code, now);
        fresh
    }

    pub fn key_up(&mut self, code: u32) {
        self.down.remove(&code);
    }
}

/// 세지 않는 수식키의 Windows 가상 키 코드.
/// Shift·Control·Alt(Menu)·Caps Lock과 그 좌우 구분 코드, 좌우 Windows 키.
pub const MODIFIER_VKS: &[u32] = &[
    0x10, 0x11, 0x12, 0x14, 0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0x5B, 0x5C,
];

pub fn is_modifier_vk(vk: u32) -> bool {
    MODIFIER_VKS.contains(&vk)
}

#[cfg(test)]
mod tests {
    use super::*;

    const A: u32 = 0x41;
    const B: u32 = 0x42;
    const TTL: Duration = Duration::from_secs(5);

    #[test]
    fn 첫_keydown은_센다() {
        let mut filter = RepeatFilter::new(TTL);
        assert!(filter.key_down(A, Instant::now()));
    }

    #[test]
    fn 떼지_않고_다시_온_keydown은_자동_반복이라_세지_않는다() {
        let mut filter = RepeatFilter::new(TTL);
        let now = Instant::now();
        assert!(filter.key_down(A, now));
        assert!(!filter.key_down(A, now + Duration::from_millis(30)));
        assert!(!filter.key_down(A, now + Duration::from_millis(60)));
    }

    #[test]
    fn 다른_키는_따로_센다() {
        let mut filter = RepeatFilter::new(TTL);
        let now = Instant::now();
        assert!(filter.key_down(A, now));
        assert!(filter.key_down(B, now));
        assert!(!filter.key_down(A, now));
    }

    #[test]
    fn keyup_뒤의_keydown은_다시_센다() {
        let mut filter = RepeatFilter::new(TTL);
        let now = Instant::now();
        assert!(filter.key_down(A, now));
        filter.key_up(A);
        assert!(filter.key_down(A, now + Duration::from_millis(100)));
    }

    #[test]
    fn 눌린_적_없는_키의_keyup은_무시한다() {
        let mut filter = RepeatFilter::new(TTL);
        filter.key_up(A);
        assert!(filter.key_down(A, Instant::now()));
    }

    #[test]
    fn keyup을_놓쳐도_ttl이_지나면_다시_센다() {
        let mut filter = RepeatFilter::new(TTL);
        let now = Instant::now();
        assert!(filter.key_down(A, now));
        assert!(filter.key_down(A, now + TTL));
    }

    #[test]
    fn ttl_직전까지는_반복으로_본다() {
        let mut filter = RepeatFilter::new(TTL);
        let now = Instant::now();
        assert!(filter.key_down(A, now));
        assert!(!filter.key_down(A, now + TTL - Duration::from_millis(1)));
    }

    #[test]
    fn 꾹_누르고_있는_동안은_반복이_만료를_미룬다() {
        let mut filter = RepeatFilter::new(TTL);
        let now = Instant::now();
        assert!(filter.key_down(A, now));
        assert!(!filter.key_down(A, now + Duration::from_secs(4)));
        assert!(!filter.key_down(A, now + Duration::from_secs(8)));
        assert!(filter.key_down(A, now + Duration::from_secs(13)));
    }

    #[test]
    fn 수식키_vk를_판정한다() {
        assert!(is_modifier_vk(0x10));
        assert!(!is_modifier_vk(0x41));
        for &vk in MODIFIER_VKS {
            assert!(is_modifier_vk(vk));
        }
    }
}
