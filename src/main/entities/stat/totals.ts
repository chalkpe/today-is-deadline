import type { Db } from '@main/shared/db'
import { addDays, type DateKey } from '@shared/model/calendar'
import type { AppScope } from '@shared/model/settings'
import type { AppShare, DayDetail, DayTotal } from '@shared/model/stats'
import { scopeFilter } from './scope'

type DateSum = { date: DateKey; sum: number }

function sumsByDate(
  db: Db,
  table: 'minute_counts' | 'adjustments',
  column: 'count' | 'delta',
  start: DateKey,
  end: DateKey,
  scope: AppScope = null,
): Map<DateKey, number> {
  const where = scopeFilter(scope, 'app_id')
  const rows = db.sqlite
    .prepare(`SELECT date, SUM(${column}) AS sum FROM ${table} WHERE date BETWEEN ? AND ?${where.sql} GROUP BY date`)
    .all(start, end, ...where.params) as DateSum[]
  return new Map(rows.map((r) => [r.date, r.sum]))
}

/** [start, end]의 모든 날짜별 총합. 조정을 더하고 음수는 0으로 맞춘다. 조정은 앱과 무관해 앱 필터와 상관없이 더한다. */
export function dayTotals(db: Db, start: DateKey, end: DateKey, scope: AppScope = null): DayTotal[] {
  const counts = sumsByDate(db, 'minute_counts', 'count', start, end, scope)
  const deltas = sumsByDate(db, 'adjustments', 'delta', start, end)
  const result: DayTotal[] = []
  for (let date = start; date <= end; date = addDays(date, 1)) {
    result.push({ date, total: Math.max(0, (counts.get(date) ?? 0) + (deltas.get(date) ?? 0)) })
  }
  return result
}

export function dayDetail(db: Db, date: DateKey, scope: AppScope = null): DayDetail {
  const where = scopeFilter(scope, 'm.app_id')
  const rows = db.sqlite
    .prepare(
      `SELECT m.app_id AS appId, COALESCE(a.name, m.app_id) AS name, SUM(m.count) AS count
       FROM minute_counts m LEFT JOIN apps a ON a.id = m.app_id
       WHERE m.date = ?${where.sql} GROUP BY m.app_id ORDER BY count DESC, m.app_id ASC`,
    )
    .all(date, ...where.params) as { appId: string; name: string; count: number }[]
  const raw = rows.reduce((sum, r) => sum + r.count, 0)
  const adjustment = (
    db.sqlite.prepare('SELECT COALESCE(SUM(delta), 0) AS sum FROM adjustments WHERE date = ?').get(date) as { sum: number }
  ).sum
  const apps: AppShare[] = rows.map((r) => ({ appId: r.appId, name: r.name, count: r.count, ratio: raw === 0 ? 0 : r.count / raw }))
  return { date, total: Math.max(0, raw + adjustment), adjustment, apps }
}
