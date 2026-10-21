import { describe, expect, it } from 'vitest'
import { PERMISSION_NOTICE_HEIGHT, panelHeight, widgetHeight } from './layout'

describe('widgetHeight', () => {
  it('옵션에 따라 높이를 계산한다', () => {
    expect(widgetHeight({ showMonthLabels: true, showTodayCount: true, detailRows: 0 })).toBe(138)
    expect(widgetHeight({ showMonthLabels: false, showTodayCount: false, detailRows: 0 })).toBe(102)
    expect(widgetHeight({ showMonthLabels: true, showTodayCount: true, detailRows: 3 })).toBe(226)
  })
})

describe('panelHeight', () => {
  const opts = { showMonthLabels: true, showTodayCount: true, detailRows: 3 }

  it('권한이 거부되면 내용과 상관없이 권한 안내 높이', () => {
    expect(panelHeight({ ...opts, denied: true })).toBe(PERMISSION_NOTICE_HEIGHT)
    expect(panelHeight({ showMonthLabels: false, showTodayCount: false, detailRows: 0, denied: true })).toBe(PERMISSION_NOTICE_HEIGHT)
  })

  it('허용(또는 확인 전)이면 widgetHeight', () => {
    expect(panelHeight({ ...opts, denied: false })).toBe(widgetHeight(opts))
    expect(panelHeight({ ...opts, detailRows: 0, denied: false })).toBe(138)
  })
})
