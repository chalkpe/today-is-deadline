import type { DateKey, MonthKey } from './calendar'

export type AppShare = { appId: string; name: string; count: number; ratio: number } // ratio 0~1
export type DayTotal = { date: DateKey; total: number }
export type DayDetail = { date: DateKey; total: number; adjustment: number; apps: AppShare[] }
export type TodayStats = { date: DateKey; total: number; weekTotal: number; apps: AppShare[] }
export type HourBucket = { hour: number; total: number; byApp: Record<string, number> }
export type DayBucket = { date: DateKey; total: number; byApp: Record<string, number> }
export type Gap = { minutes: number; from: number; to: number } // from/to는 분(0~1439)
export type DayStats = {
  date: DateKey
  total: number
  adjustment: number
  previousTotal: number
  activeMinutes: number
  peakHour: { hour: number; count: number } | null
  longestGap: Gap | null
  hourly: HourBucket[]
  strip: number[]
  apps: AppShare[]
  topApps: string[]
}
export type WeekStats = {
  start: DateKey
  end: DateKey
  total: number
  previousTotal: number
  activeDays: number
  dailyAverage: number
  bestDay: DayTotal | null
  daily: DayBucket[]
  dowHour: number[][]
  apps: AppShare[]
  topApps: string[]
}
export type MonthStats = {
  month: MonthKey
  total: number
  previousTotal: number
  activeDays: number
  elapsedDays: number
  dailyAverage: number
  bestDay: DayTotal | null
  days: DayTotal[]
  apps: AppShare[]
}
export type Adjustment = { id: number; date: DateKey; delta: number; memo: string; createdAt: string }

/** round((c-p)/p*100). p<=0이면 null */
export function changeRatio(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export function foldApps(
  apps: AppShare[],
  top: number,
): { shown: AppShare[]; others: { count: number; ratio: number; appCount: number } | null } {
  if (apps.length <= top) return { shown: apps, others: null }
  const rest = apps.slice(top)
  return {
    shown: apps.slice(0, top),
    others: {
      count: rest.reduce((sum, a) => sum + a.count, 0),
      ratio: rest.reduce((sum, a) => sum + a.ratio, 0),
      appCount: rest.length,
    },
  }
}

export function topAppIds(apps: AppShare[], n: number): string[] {
  return apps.slice(0, n).map((a) => a.appId)
}

/** 오름차순 활동 분 목록에서 인접 차이의 최댓값. 2개 미만이면 null */
export function longestGap(activeMinutesSorted: number[]): Gap | null {
  let best: Gap | null = null
  for (let i = 1; i < activeMinutesSorted.length; i++) {
    const from = activeMinutesSorted[i - 1]
    const to = activeMinutesSorted[i]
    if (!best || to - from > best.minutes) best = { minutes: to - from, from, to }
  }
  return best
}

export function formatCount(n: number): string {
  return n.toLocaleString('ko-KR')
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

export function formatMinute(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}
