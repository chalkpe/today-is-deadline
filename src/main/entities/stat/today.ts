import type { Db } from '@main/shared/db'
import { type DateKey, weekRange } from '@shared/model/calendar'
import type { AppScope } from '@shared/model/settings'
import type { TodayStats } from '@shared/model/stats'
import { appShares } from './shares'
import { dayTotals } from './totals'

export function todayStats(db: Db, today: DateKey, scope: AppScope = null): TodayStats {
  const { start, end } = weekRange(today)
  const weekTotal = dayTotals(db, start, end, scope).reduce((sum, d) => sum + d.total, 0)
  const { total } = dayTotals(db, today, today, scope)[0]
  return { date: today, total, weekTotal, apps: appShares(db, today, today, scope) }
}
