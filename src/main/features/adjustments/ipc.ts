import { addAdjustment, listAdjustments, removeAdjustment } from '@main/entities/stat'
import type { Db } from '@main/shared/db'
import { type Broadcast, type Handlers, requireDateKey } from '@main/shared/ipc'
import { CHANNELS, PUSH } from '@shared/ipc'

export const INVALID_ADJUSTMENT_ID = '잘못된 조정 항목입니다'

type Deps = { db: Db; now: () => Date; send: Broadcast; pushToday: () => void }

export function adjustmentHandlers({ db, now, send, pushToday }: Deps) {
  // 저장·삭제 뒤 목록을 알리고, 오늘 합계가 바뀌었을 수 있으므로 오늘 통계도 보낸다
  const changed = () => {
    send(PUSH.ADJUSTMENTS, listAdjustments(db))
    pushToday()
  }
  return {
    [CHANNELS.ADJUST_LIST]: () => listAdjustments(db),
    [CHANNELS.ADJUST_ADD]: (input) => {
      const { date, delta, memo } = (input ?? {}) as Record<string, unknown>
      // 조정값(0이 아닌 정수) 검증은 addAdjustment가 한다
      const added = addAdjustment(
        db,
        { date: requireDateKey(date), delta: delta as number, memo: typeof memo === 'string' ? memo : '' },
        now().toISOString(),
      )
      changed()
      return added
    },
    [CHANNELS.ADJUST_REMOVE]: (id) => {
      if (!Number.isInteger(id)) throw new Error(INVALID_ADJUSTMENT_ID)
      removeAdjustment(db, id)
      changed()
    },
  } satisfies Handlers<'adjust:list' | 'adjust:add' | 'adjust:remove'>
}
