import type { Db } from '@main/shared/db'
import type { DateKey } from '@shared/model/calendar'
import type { AppScope } from '@shared/model/settings'
import type { AppShare } from '@shared/model/stats'
import { scopeFilter } from './scope'

/** [start, end] 기간의 앱별 원본 합. 비율은 원본 합 기준, 많은 순(동률은 appId 순). */
export function appShares(db: Db, start: DateKey, end: DateKey, scope: AppScope = null): AppShare[] {
  const where = scopeFilter(scope, 'm.app_id')
  const rows = db.sqlite
    .prepare(
      `SELECT m.app_id AS appId, COALESCE(a.name, m.app_id) AS name, SUM(m.count) AS count
       FROM minute_counts m LEFT JOIN apps a ON a.id = m.app_id
       WHERE m.date BETWEEN ? AND ?${where.sql} GROUP BY m.app_id ORDER BY count DESC, m.app_id ASC`,
    )
    .all(start, end, ...where.params) as { appId: string; name: string; count: number }[]
  const raw = rows.reduce((sum, r) => sum + r.count, 0)
  return rows.map((r) => ({ ...r, ratio: raw === 0 ? 0 : r.count / raw }))
}
