import type { Db } from '@main/shared/db'
import { type DateKey, weekRange } from '@shared/model/calendar'
import type { TodayStats } from '@shared/model/stats'
import { appShares } from './shares'
import { dayTotals } from './totals'

export function todayStats(db: Db, today: DateKey): TodayStats {
  const { start, end } = weekRange(today)
  const weekTotal = dayTotals(db, start, end).reduce((sum, d) => sum + d.total, 0)
  const { total } = dayTotals(db, today, today)[0]
  return { date: today, total, weekTotal, apps: appShares(db, today, today) }
}
