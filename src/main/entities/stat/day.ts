import type { Db } from '@main/shared/db'
import { addDays, type DateKey } from '@shared/model/calendar'
import type { AppScope } from '@shared/model/settings'
import { type DayStats, type HourBucket, longestGap, topAppIds } from '@shared/model/stats'
import { scopeFilter } from './scope'
import { appShares } from './shares'
import { dayTotals } from './totals'

type Row = { minute: number; appId: string; count: number }

function dayRows(db: Db, date: DateKey, scope: AppScope): Row[] {
  const where = scopeFilter(scope, 'app_id')
  return db.sqlite
    .prepare(`SELECT minute, app_id AS appId, SUM(count) AS count FROM minute_counts WHERE date = ?${where.sql} GROUP BY minute, app_id`)
    .all(date, ...where.params) as Row[]
}

function hourlyBuckets(rows: Row[]): HourBucket[] {
  const hourly: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0, byApp: {} }))
  for (const r of rows) {
    const bucket = hourly[Math.floor(r.minute / 60)]
    bucket.total += r.count
    bucket.byApp[r.appId] = (bucket.byApp[r.appId] ?? 0) + r.count
  }
  return hourly
}

export function dayStats(db: Db, date: DateKey, scope: AppScope = null): DayStats {
  const { total } = dayTotals(db, date, date, scope)[0]
  const previousDate = addDays(date, -1)
  const previous = dayTotals(db, previousDate, previousDate, scope)[0]
  const adjustment = (
    db.sqlite.prepare('SELECT COALESCE(SUM(delta), 0) AS sum FROM adjustments WHERE date = ?').get(date) as { sum: number }
  ).sum
  const rows = dayRows(db, date, scope)
  const hourly = hourlyBuckets(rows)
  const strip = new Array<number>(144).fill(0)
  const active = new Set<number>()
  for (const r of rows) {
    strip[Math.floor(r.minute / 10)] += r.count
    if (r.count > 0) active.add(r.minute)
  }
  const peak = hourly.reduce((best, h) => (h.total > best.total ? h : best), hourly[0])
  const apps = appShares(db, date, date, scope)
  return {
    date,
    total,
    adjustment,
    previousTotal: previous.total,
    activeMinutes: active.size,
    peakHour: peak.total > 0 ? { hour: peak.hour, count: peak.total } : null,
    longestGap: longestGap([...active].sort((a, b) => a - b)),
    hourly,
    strip,
    apps,
    topApps: topAppIds(apps, 4),
  }
}
