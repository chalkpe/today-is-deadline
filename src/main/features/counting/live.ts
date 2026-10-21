import { throttle } from '@main/shared/timing'
import type { Counter } from './counter'

/** 스펙 8.5: 오늘 값이 바뀌면 최대 1초에 한 번 푸시 */
export const LIVE_FLUSH_MS = 1000

/**
 * 타자 중에는 키다운을 1초 스로틀(앞·끝 실행)로 받아 flush한다.
 * flush가 onTodayChanged를 알리므로 오늘 통계가 1초 안에 푸시되고, 5초 주기 flush는 안전망으로 남는다.
 * 돌려준 함수로 구독을 끊고 대기 중인 flush를 버린다.
 */
export function flushWhileTyping(counter: Pick<Counter, 'onKeydown' | 'flush'>, ms = LIVE_FLUSH_MS): () => void {
  const throttled = throttle(() => counter.flush(), ms)
  const off = counter.onKeydown(throttled.call)
  return () => {
    off()
    throttled.cancel()
  }
}
