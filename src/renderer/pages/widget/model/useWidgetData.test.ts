import { heatmapRange } from '@shared/model/calendar'
import { MAX_WEEKS, MIN_WEEKS } from '@shared/model/layout'
import { describe, expect, it } from 'vitest'
import { maxWidgetWidth, visibleTotals, weeksForWidth } from './useWidgetData'

describe('weeksForWidth', () => {
  it('패널 여백(과 요일 라벨)을 뺀 내용 너비를 셀 간격으로 나눈다', () => {
    expect(weeksForWidth(320, false)).toBe(25) // floor(300 / 12)
    expect(weeksForWidth(336, true)).toBe(25) // floor((336 - 20 - 16) / 12)
  })

  it('좁은 창도 최소 주 수는 보인다', () => {
    expect(weeksForWidth(50, true)).toBe(8)
    expect(weeksForWidth(50, true)).toBe(MIN_WEEKS)
  })

  it('넓은 창은 57주에서 멈춘다(heatmap:range 400일 상한)', () => {
    expect(MAX_WEEKS).toBe(57)
    expect(weeksForWidth(5000, false)).toBe(MAX_WEEKS)
    // 오늘이 일요일이어도 57주 범위는 2025-09-22 ~ 2026-10-25, 399일
    expect(heatmapRange('2026-10-25', MAX_WEEKS)).toEqual({ start: '2025-09-22', end: '2026-10-25' })
  })
})

describe('visibleTotals', () => {
  const range = { start: '2026-10-19', end: '2026-10-22' }
  const today = (total: number, date = '2026-10-22') => ({ date, total, weekTotal: total, apps: [] })

  it('푸시로 받은 오늘 합계가 범위 조회 값을 덮는다', () => {
    const totals = [
      { date: '2026-10-21', total: 5 },
      { date: '2026-10-22', total: 30 },
    ]
    expect(visibleTotals(totals, range, today(42))).toEqual([
      { date: '2026-10-21', total: 5 },
      { date: '2026-10-22', total: 42 },
    ])
  })

  it('범위 조회에 오늘이 아직 없어도 오늘 칸을 채운다', () => {
    expect(visibleTotals([{ date: '2026-10-21', total: 5 }], range, today(3))).toEqual([
      { date: '2026-10-21', total: 5 },
      { date: '2026-10-22', total: 3 },
    ])
  })

  it('범위 밖 날짜는 버리고, 오늘 통계가 없거나 범위 밖이면 덮지 않는다', () => {
    const totals = [
      { date: '2026-10-18', total: 9 },
      { date: '2026-10-22', total: 30 },
    ]
    expect(visibleTotals(totals, range, null)).toEqual([{ date: '2026-10-22', total: 30 }])
    expect(visibleTotals(totals, range, today(1, '2026-10-23'))).toEqual([{ date: '2026-10-22', total: 30 }])
  })
})

describe('maxWidgetWidth', () => {
  it('최대 주 수를 딱 채우는 너비', () => {
    expect(maxWidgetWidth(false)).toBe(57 * 12 + 20)
    expect(maxWidgetWidth(true)).toBe(57 * 12 + 20 + 16)
    expect(weeksForWidth(maxWidgetWidth(true), true)).toBe(MAX_WEEKS)
    expect(weeksForWidth(maxWidgetWidth(false) - 1, false)).toBe(MAX_WEEKS - 1)
  })
})
