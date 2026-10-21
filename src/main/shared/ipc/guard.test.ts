import { addDays } from '@shared/model/calendar'
import { describe, expect, it } from 'vitest'
import { INVALID_DATE, requireDateKey, requireDateRange, requireMonthKey } from './guard'

describe('requireDateKey', () => {
  it('올바른 날짜는 그대로 돌려준다', () => {
    expect(requireDateKey('2026-10-22')).toBe('2026-10-22')
  })

  it.each([['2026-02-30'], ['2026-10-22 '], ['../x'], [''], [null], [undefined], [20261022]])('%j는 거부한다', (value) => {
    expect(() => requireDateKey(value)).toThrow(INVALID_DATE)
  })
})

describe('requireMonthKey', () => {
  it('올바른 월은 그대로 돌려준다', () => {
    expect(requireMonthKey('2026-10')).toBe('2026-10')
  })

  it.each([['2026-13'], ['2026-10-01'], [null], [{}]])('%j는 거부한다', (value) => {
    expect(() => requireMonthKey(value)).toThrow(INVALID_DATE)
  })
})

describe('requireDateRange', () => {
  it('시작 ≤ 끝이고 길이가 상한 이하면 통과한다', () => {
    const end = '2026-10-22'
    const start = addDays(end, -399) // 400일
    expect(requireDateRange({ start, end }, 400)).toEqual({ start, end })
    expect(requireDateRange({ start: end, end }, 400)).toEqual({ start: end, end })
  })

  it('상한을 넘으면 거부한다', () => {
    const end = '2026-10-22'
    expect(() => requireDateRange({ start: addDays(end, -400), end }, 400)).toThrow(INVALID_DATE)
  })

  it('시작이 끝보다 늦으면 거부한다', () => {
    expect(() => requireDateRange({ start: '2026-10-23', end: '2026-10-22' }, 400)).toThrow(INVALID_DATE)
  })

  it.each([[null], ['2026-10-22'], [{ start: '2026-10-22' }], [{ start: 'x', end: '2026-10-22' }]])('%j는 거부한다', (value) => {
    expect(() => requireDateRange(value, 400)).toThrow(INVALID_DATE)
  })
})
