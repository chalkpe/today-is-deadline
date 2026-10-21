export type DateKey = string // 'YYYY-MM-DD' 로컬
export type MonthKey = string // 'YYYY-MM'

const WEEKDAYS_KO = ['월', '화', '수', '목', '금', '토', '일']

const pad = (value: number) => String(value).padStart(2, '0')

const splitKey = (key: DateKey | MonthKey) => key.split('-').map(Number)

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromDateKey(key: DateKey): Date {
  const [year, month, day] = splitKey(key)
  return new Date(year, month - 1, day)
}

export function addDays(key: DateKey, days: number): DateKey {
  const [year, month, day] = splitKey(key)
  return toDateKey(new Date(year, month - 1, day + days))
}

export function weekdayIndex(key: DateKey): number {
  return (fromDateKey(key).getDay() + 6) % 7
}

export function mondayOf(key: DateKey): DateKey {
  return addDays(key, -weekdayIndex(key))
}

export function weekRange(key: DateKey): { start: DateKey; end: DateKey } {
  const start = mondayOf(key)
  return { start, end: addDays(start, 6) }
}

export function monthKeyOf(key: DateKey): MonthKey {
  return key.slice(0, 7)
}

export function monthRange(month: MonthKey): { start: DateKey; end: DateKey; days: number } {
  const [year, monthNumber] = splitKey(month)
  const days = new Date(year, monthNumber, 0).getDate()
  return { start: `${month}-01`, end: `${month}-${pad(days)}`, days }
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [year, monthNumber] = splitKey(month)
  const date = new Date(year, monthNumber - 1 + n, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function heatmapRange(today: DateKey, weeks: number): { start: DateKey; end: DateKey } {
  return { start: addDays(mondayOf(today), -(weeks - 1) * 7), end: today }
}

export function visibleWeeks(contentWidth: number, cellPitch: number): number {
  return Math.max(1, Math.floor(contentWidth / cellPitch))
}

export function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

export function msUntilNextMidnight(now: Date): number {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return nextMidnight.getTime() - now.getTime()
}

export function formatDateKo(key: DateKey): string {
  const [, month, day] = splitKey(key)
  return `${month}월 ${day}일 (${WEEKDAYS_KO[weekdayIndex(key)]})`
}

export function formatWeekRangeKo(monday: DateKey): string {
  const [, startMonth, startDay] = splitKey(monday)
  const [, endMonth, endDay] = splitKey(addDays(monday, 6))
  const end = startMonth === endMonth ? `${endDay}일` : `${endMonth}월 ${endDay}일`
  return `${startMonth}월 ${startDay}일 ~ ${end}`
}

export function formatMonthKo(month: MonthKey): string {
  const [year, monthNumber] = splitKey(month)
  return `${year}년 ${monthNumber}월`
}
