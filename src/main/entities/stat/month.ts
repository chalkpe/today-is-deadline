import type { Db } from '@main/shared/db'
import { addMonths, type DateKey, type MonthKey, monthRange } from '@shared/model/calendar'
import type { AppScope } from '@shared/model/settings'
import type { MonthStats } from '@shared/model/stats'
import { appShares } from './shares'
import { summarizeDays } from './summary'
import { dayTotals } from './totals'

export function monthStats(db: Db, month: MonthKey, today: DateKey, scope: AppScope = null): MonthStats {
  const { start, end } = monthRange(month)
  const days = dayTotals(db, start, end, scope)
  const prev = monthRange(addMonths(month, -1))
  const previousTotal = dayTotals(db, prev.start, prev.end, scope).reduce((sum, d) => sum + d.total, 0)
  const elapsedDays = days.filter((d) => d.date <= today).length
  return { month, ...summarizeDays(days), previousTotal, elapsedDays, days, apps: appShares(db, start, end, scope) }
}
