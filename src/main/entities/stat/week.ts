import type { Db } from '@main/shared/db'
import { addDays, type DateKey, weekdayIndex } from '@shared/model/calendar'
import { type DayBucket, topAppIds, type WeekStats } from '@shared/model/stats'
import { appShares } from './shares'
import { summarizeDays } from './summary'
import { dayTotals } from './totals'

type Row = { date: DateKey; hour: number; appId: string; count: number }

export function weekStats(db: Db, monday: DateKey): WeekStats {
  const end = addDays(monday, 6)
  const totals = dayTotals(db, monday, end)
  const rows = db.sqlite
    .prepare(
      `SELECT date, minute / 60 AS hour, app_id AS appId, SUM(count) AS count
       FROM minute_counts WHERE date BETWEEN ? AND ? GROUP BY date, minute / 60, app_id`,
    )
    .all(monday, end) as Row[]
  const daily: DayBucket[] = totals.map((d) => ({ ...d, byApp: {} }))
  const dowHour = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  for (const r of rows) {
    const index = weekdayIndex(r.date)
    dowHour[index][r.hour] += r.count
    daily[index].byApp[r.appId] = (daily[index].byApp[r.appId] ?? 0) + r.count
  }
  const previousTotal = dayTotals(db, addDays(monday, -7), addDays(monday, -1)).reduce((sum, d) => sum + d.total, 0)
  const apps = appShares(db, monday, end)
  return { start: monday, end, ...summarizeDays(totals), previousTotal, daily, dowHour, apps, topApps: topAppIds(apps, 4) }
}
