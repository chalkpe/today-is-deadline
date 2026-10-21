import { describe, expect, it } from 'vitest'
import { widgetHeight } from './layout'

describe('widgetHeight', () => {
  it('옵션에 따라 높이를 계산한다', () => {
    expect(widgetHeight({ showMonthLabels: true, showTodayCount: true, detailRows: 0 })).toBe(138)
    expect(widgetHeight({ showMonthLabels: false, showTodayCount: false, detailRows: 0 })).toBe(102)
    expect(widgetHeight({ showMonthLabels: true, showTodayCount: true, detailRows: 3 })).toBe(226)
  })
})
