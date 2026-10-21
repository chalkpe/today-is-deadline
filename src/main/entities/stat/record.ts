import type { Db } from '@main/shared/db'
import type { DateKey } from '@shared/model/calendar'

export type MinuteEntry = { date: DateKey; minute: number; appId: string; count: number }

/** 분 단위 입력 수를 한 트랜잭션으로 누적한다. 앱 행은 호출 전에 upsertApp으로 만들어 둔다. */
export function recordMinutes(db: Db, entries: MinuteEntry[]): void {
  if (entries.length === 0) return
  const stmt = db.sqlite.prepare(
    `INSERT INTO minute_counts (date, minute, app_id, count) VALUES (?, ?, ?, ?)
     ON CONFLICT(date, minute, app_id) DO UPDATE SET count = count + excluded.count`,
  )
  db.sqlite.exec('BEGIN')
  try {
    for (const e of entries) stmt.run(e.date, e.minute, e.appId, e.count)
    db.sqlite.exec('COMMIT')
  } catch (error) {
    db.sqlite.exec('ROLLBACK')
    throw error
  }
}
