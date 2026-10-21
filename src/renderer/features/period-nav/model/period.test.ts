import { describe, expect, it } from 'vitest'
import { atDate, canGoForward, contains, current, type Period, shift, switchTab, title } from './period'

const today = '2026-10-22' // 목요일

describe('current', () => {
  it('오늘을 품는 기간', () => {
    expect(current('day', today)).toEqual({ tab: 'day', date: today })
    expect(current('week', today)).toEqual({ tab: 'week', monday: '2026-10-19' })
    expect(current('month', today)).toEqual({ tab: 'month', month: '2026-10' })
  })
})

describe('shift', () => {
  it('이번 주에서 앞으로는 가지 않고, 뒤로는 한 주 전', () => {
    const p: Period = { tab: 'week', monday: '2026-10-19' }
    expect(shift(p, 1, today)).toBe(p)
    expect(shift(p, -1, today)).toEqual({ tab: 'week', monday: '2026-10-12' })
  })

  it('일: 어제에서 오늘까지는 가고 오늘에서 멈춘다', () => {
    expect(shift({ tab: 'day', date: '2026-10-21' }, 1, today)).toEqual({ tab: 'day', date: today })
    const p: Period = { tab: 'day', date: today }
    expect(shift(p, 1, today)).toBe(p)
    expect(shift({ tab: 'day', date: '2026-10-01' }, -1, today)).toEqual({ tab: 'day', date: '2026-09-30' })
  })

  it('월: 해를 넘기고 이번 달에서 멈춘다', () => {
    expect(shift({ tab: 'month', month: '2026-01' }, -1, today)).toEqual({ tab: 'month', month: '2025-12' })
    expect(shift({ tab: 'month', month: '2026-09' }, 1, today)).toEqual({ tab: 'month', month: '2026-10' })
    const p: Period = { tab: 'month', month: '2026-10' }
    expect(shift(p, 1, today)).toBe(p)
  })
})

describe('switchTab', () => {
  it('일 → 그 날짜를 품는 주·월', () => {
    expect(switchTab({ tab: 'day', date: today }, 'month', today)).toEqual({ tab: 'month', month: '2026-10' })
    expect(switchTab({ tab: 'day', date: '2026-09-30' }, 'week', today)).toEqual({ tab: 'week', monday: '2026-09-28' })
  })

  it('지난 주 → 그 주 월요일, 지난 달 → 1일', () => {
    expect(switchTab({ tab: 'week', monday: '2026-09-28' }, 'day', today)).toEqual({ tab: 'day', date: '2026-09-28' })
    expect(switchTab({ tab: 'week', monday: '2026-09-28' }, 'month', today)).toEqual({ tab: 'month', month: '2026-09' })
    expect(switchTab({ tab: 'month', month: '2026-08' }, 'day', today)).toEqual({ tab: 'day', date: '2026-08-01' })
    expect(switchTab({ tab: 'month', month: '2026-08' }, 'week', today)).toEqual({ tab: 'week', monday: '2026-07-27' })
  })

  it('오늘을 품는 기간이면 오늘을 기준으로 삼는다', () => {
    expect(switchTab({ tab: 'week', monday: '2026-10-19' }, 'day', today)).toEqual({ tab: 'day', date: today })
    expect(switchTab({ tab: 'month', month: '2026-10' }, 'day', today)).toEqual({ tab: 'day', date: today })
    expect(switchTab({ tab: 'month', month: '2026-10' }, 'week', today)).toEqual({ tab: 'week', monday: '2026-10-19' })
    // 9월 28일 주는 10월 첫 주이기도 하지만 오늘을 품지 않으므로 월요일 기준
    expect(switchTab({ tab: 'week', monday: '2026-09-28' }, 'month', today)).toEqual({ tab: 'month', month: '2026-09' })
  })
})

describe('atDate', () => {
  it('오늘 뒤의 날짜는 오늘로 맞춘다', () => {
    expect(atDate('day', '2026-10-25', today)).toEqual({ tab: 'day', date: today })
    expect(atDate('day', '2026-10-02', today)).toEqual({ tab: 'day', date: '2026-10-02' })
    expect(atDate('week', '2027-01-01', today)).toEqual({ tab: 'week', monday: '2026-10-19' })
  })
})

describe('title', () => {
  it('formatDateKo / formatWeekRangeKo / formatMonthKo', () => {
    expect(title({ tab: 'day', date: today })).toBe('10월 22일 (목)')
    expect(title({ tab: 'week', monday: '2026-09-28' })).toBe('9월 28일 ~ 10월 4일')
    expect(title({ tab: 'month', month: '2026-10' })).toBe('2026년 10월')
  })
})

describe('canGoForward', () => {
  it('오늘을 품는 기간이면 false', () => {
    expect(canGoForward(current('day', today), today)).toBe(false)
    expect(canGoForward(current('week', today), today)).toBe(false)
    expect(canGoForward(current('month', today), today)).toBe(false)
  })

  it('지난 기간이면 true', () => {
    expect(canGoForward({ tab: 'day', date: '2026-10-21' }, today)).toBe(true)
    expect(canGoForward({ tab: 'week', monday: '2026-10-12' }, today)).toBe(true)
    expect(canGoForward({ tab: 'month', month: '2026-09' }, today)).toBe(true)
  })
})

describe('contains', () => {
  it('기간이 그 날짜를 품는지', () => {
    expect(contains({ tab: 'day', date: today }, today)).toBe(true)
    expect(contains({ tab: 'day', date: '2026-10-21' }, today)).toBe(false)
    expect(contains({ tab: 'week', monday: '2026-10-19' }, '2026-10-25')).toBe(true)
    expect(contains({ tab: 'week', monday: '2026-10-12' }, today)).toBe(false)
    expect(contains({ tab: 'month', month: '2026-10' }, '2026-10-31')).toBe(true)
    expect(contains({ tab: 'month', month: '2026-09' }, today)).toBe(false)
  })
})
