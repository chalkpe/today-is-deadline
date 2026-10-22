import type { Db } from '@main/shared/db'
import type { DateKey } from '@shared/model/calendar'
import type { Adjustment } from '@shared/model/stats'

type Row = { id: number; date: DateKey; delta: number; memo: string; created_at: string }

const toAdjustment = (r: Row): Adjustment => ({ id: r.id, date: r.date, delta: r.delta, memo: r.memo, createdAt: r.created_at })

export function addAdjustment(db: Db, input: { date: DateKey; delta: number; memo: string }, createdAt: string): Adjustment {
  // 가감 폼과 같은 기준(안전한 정수). 1e300 같은 값은 SQLite에 실수로 저장돼 합계가 실수·Infinity가 된다.
  if (!Number.isSafeInteger(input.delta) || input.delta === 0) throw new Error('조정값은 0이 아닌 정수여야 합니다')
  const info = db.sqlite
    .prepare('INSERT INTO adjustments (date, delta, memo, created_at) VALUES (?, ?, ?, ?)')
    .run(input.date, input.delta, input.memo, createdAt)
  return { id: Number(info.lastInsertRowid), date: input.date, delta: input.delta, memo: input.memo, createdAt }
}

export function listAdjustments(db: Db): Adjustment[] {
  const rows = db.sqlite
    .prepare('SELECT id, date, delta, memo, created_at FROM adjustments ORDER BY created_at DESC, id DESC')
    .all() as Row[]
  return rows.map(toAdjustment)
}

export function removeAdjustment(db: Db, id: number): void {
  db.sqlite.prepare('DELETE FROM adjustments WHERE id = ?').run(id)
}
