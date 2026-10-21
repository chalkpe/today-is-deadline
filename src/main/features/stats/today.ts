import { todayStats } from '@main/entities/stat'
import type { Db } from '@main/shared/db'
import type { Broadcast } from '@main/shared/ipc'
import type { Logger } from '@main/shared/log'
import { throttle } from '@main/shared/timing'
import { PUSH } from '@shared/ipc'
import { toDateKey } from '@shared/model/calendar'
import type { TodayStats } from '@shared/model/stats'

export type TodayPusher = {
  /** 1초 스로틀(앞·끝 전송). 카운터 flush 뒤에 부른다. */
  push(): void
  /** 바로 보낸다(가감 저장 직후처럼 드문 변경). */
  pushNow(): void
  cancel(): void
}

type Deps = { db: Db; now: () => Date; send: Broadcast; log: Pick<Logger, 'error'>; intervalMs?: number }

/** 오늘 통계(PUSH.TODAY)를 계산해 모든 창에 보낸다. */
export function createTodayPusher({ db, now, send, log, intervalMs = 1000 }: Deps): TodayPusher {
  const pushNow = () => {
    // 타이머에서도 불리므로 예외가 main 프로세스 밖으로 새지 않게 한다
    let stats: TodayStats
    try {
      stats = todayStats(db, toDateKey(now()))
    } catch (err) {
      log.error('push:today', err)
      return
    }
    send(PUSH.TODAY, stats)
  }
  const throttled = throttle(pushNow, intervalMs)
  return { push: throttled.call, pushNow, cancel: throttled.cancel }
}
