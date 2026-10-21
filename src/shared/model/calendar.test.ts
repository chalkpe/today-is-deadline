import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  formatDateKo,
  formatMonthKo,
  formatWeekRangeKo,
  fromDateKey,
  heatmapRange,
  isDateKey,
  isMonthKey,
  minuteOfDay,
  mondayOf,
  monthRange,
  msUntilNextMidnight,
  toDateKey,
  visibleWeeks,
  weekdayIndex,
  weekRange,
} from './calendar'

describe('calendar', () => {
  it('toDateKey는 로컬 날짜를 쓴다', () => {
    expect(toDateKey(new Date(2026, 9, 22, 23, 59))).toBe('2026-10-22')
  })
  it('fromDateKey는 로컬 자정', () => {
    expect(fromDateKey('2026-10-22').getHours()).toBe(0)
    expect(toDateKey(fromDateKey('2026-10-22'))).toBe('2026-10-22')
  })
  it('addDays는 월·연 경계를 넘는다', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('weekdayIndex는 월요일이 0', () => {
    expect(weekdayIndex('2026-10-19')).toBe(0)
    expect(weekdayIndex('2026-10-25')).toBe(6)
  })
  it('mondayOf와 weekRange', () => {
    expect(mondayOf('2026-10-22')).toBe('2026-10-19')
    expect(mondayOf('2026-10-19')).toBe('2026-10-19')
    expect(weekRange('2026-10-25')).toEqual({ start: '2026-10-19', end: '2026-10-25' })
  })
  it('monthRange·addMonths', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28', days: 28 })
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
  it('heatmapRange는 오늘이 속한 주를 마지막 열로 둔다', () => {
    expect(heatmapRange('2026-10-22', 3)).toEqual({ start: '2026-10-05', end: '2026-10-22' })
  })
  it('visibleWeeks', () => {
    expect(visibleWeeks(300, 12)).toBe(25)
    expect(visibleWeeks(5, 12)).toBe(1)
  })
  it('minuteOfDay·msUntilNextMidnight', () => {
    expect(minuteOfDay(new Date(2026, 9, 22, 13, 15))).toBe(795)
    expect(msUntilNextMidnight(new Date(2026, 9, 22, 23, 59, 0))).toBe(60_000)
  })
  it('한국어 포맷', () => {
    expect(formatDateKo('2026-10-14')).toBe('10월 14일 (수)')
    expect(formatWeekRangeKo('2026-10-20')).toBe('10월 20일 ~ 26일')
    expect(formatWeekRangeKo('2026-10-27')).toBe('10월 27일 ~ 11월 2일')
    expect(formatMonthKo('2026-10')).toBe('2026년 10월')
  })
  it('isDateKey는 형식과 실제 날짜를 모두 본다', () => {
    expect(isDateKey('2026-10-22')).toBe(true)
    expect(isDateKey('2024-02-29')).toBe(true)
    expect(isDateKey('2026-02-29')).toBe(false)
    expect(isDateKey('2026-13-01')).toBe(false)
    expect(isDateKey('2026-10-32')).toBe(false)
    expect(isDateKey('2026-1-2')).toBe(false)
    expect(isDateKey('2026-10-22T00:00')).toBe(false)
    expect(isDateKey(' 2026-10-22')).toBe(false)
    expect(isDateKey(20261022)).toBe(false)
    expect(isDateKey(null)).toBe(false)
  })
  it('isMonthKey는 YYYY-MM과 1~12월만', () => {
    expect(isMonthKey('2026-10')).toBe(true)
    expect(isMonthKey('2026-01')).toBe(true)
    expect(isMonthKey('2026-12')).toBe(true)
    expect(isMonthKey('2026-00')).toBe(false)
    expect(isMonthKey('2026-13')).toBe(false)
    expect(isMonthKey('2026-1')).toBe(false)
    expect(isMonthKey('2026-10-01')).toBe(false)
    expect(isMonthKey(undefined)).toBe(false)
  })
})
