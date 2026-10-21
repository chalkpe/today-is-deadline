import type { DayTotal } from '@shared/model/stats'

/** 날짜별 합계에서 총합·활동일 수·일평균·최고의 날을 계산한다. */
export function summarizeDays(days: DayTotal[]): { total: number; activeDays: number; dailyAverage: number; bestDay: DayTotal | null } {
  const total = days.reduce((sum, d) => sum + d.total, 0)
  const activeDays = days.filter((d) => d.total > 0).length
  let bestDay: DayTotal | null = null
  for (const d of days) if (d.total > 0 && (!bestDay || d.total > bestDay.total)) bestDay = d
  return { total, activeDays, dailyAverage: activeDays ? Math.round(total / activeDays) : 0, bestDay }
}
