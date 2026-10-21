import { type DateKey, fromDateKey, isDateKey, isMonthKey, type MonthKey } from '@shared/model/calendar'

// renderer에서 온 인자는 타입 계약과 달리 무엇이든 될 수 있으므로 조회 전에 확인한다.
// 던진 오류는 invoke를 거부된 Promise로 renderer에 돌려준다.

export const INVALID_DATE = '잘못된 날짜입니다'

const DAY_MS = 86_400_000

export function requireDateKey(value: unknown): DateKey {
  if (!isDateKey(value)) throw new Error(INVALID_DATE)
  return value
}

export function requireMonthKey(value: unknown): MonthKey {
  if (!isMonthKey(value)) throw new Error(INVALID_DATE)
  return value
}

/** start ≤ end이고 양 끝을 포함한 길이가 maxDays 이하인 범위만 통과시킨다. */
export function requireDateRange(value: unknown, maxDays: number): { start: DateKey; end: DateKey } {
  if (typeof value !== 'object' || value === null) throw new Error(INVALID_DATE)
  const { start, end } = value as Record<string, unknown>
  const range = { start: requireDateKey(start), end: requireDateKey(end) }
  // 서머타임으로 하루가 23·25시간일 수 있어 반올림한다
  const days = Math.round((fromDateKey(range.end).getTime() - fromDateKey(range.start).getTime()) / DAY_MS) + 1
  if (days < 1 || days > maxDays) throw new Error(INVALID_DATE)
  return range
}
