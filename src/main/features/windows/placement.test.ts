import { DEFAULT_SETTINGS, type Settings } from '@shared/model/settings'
import { describe, expect, it } from 'vitest'
import { widgetBounds } from './placement'

const primary = { x: 0, y: 25, width: 1440, height: 875 }
const secondary = { x: 1440, y: 0, width: 1920, height: 1080 }

const withWidget = (widget: Partial<Settings['widget']>, heatmap: Partial<Settings['heatmap']> = {}): Settings => ({
  ...DEFAULT_SETTINGS,
  widget: { ...DEFAULT_SETTINGS.widget, ...widget },
  heatmap: { ...DEFAULT_SETTINGS.heatmap, ...heatmap },
})

describe('widgetBounds', () => {
  it('저장된 위치가 없으면 주 디스플레이 오른쪽 위에 여백을 두고, 높이는 펼침 없는 widgetHeight', () => {
    // 높이 = 10*2 + 7*10 + 6*2 + 월 라벨 14 + 하단 22 = 138
    expect(widgetBounds(withWidget({}), [primary], primary)).toEqual({ x: 1440 - 320 - 24, y: 25 + 24, width: 320, height: 138 })
  })

  it('저장된 위치가 화면 안이면 그대로 쓴다(보조 디스플레이 포함)', () => {
    expect(widgetBounds(withWidget({ x: 2000, y: 300, width: 400 }), [primary, secondary], primary)).toEqual({
      x: 2000,
      y: 300,
      width: 400,
      height: 138,
    })
  })

  it('저장된 디스플레이가 사라져 화면 밖이면 주 디스플레이 안으로 되돌린다', () => {
    expect(widgetBounds(withWidget({ x: 2000, y: 300 }), [primary], primary)).toMatchObject({ x: 40, y: 65 })
  })

  it('월 라벨·오늘 타수를 끄면 그만큼 낮아지고, 소수 좌표는 반올림한다', () => {
    const bounds = widgetBounds(withWidget({ x: 100.4, y: 200.6 }, { showMonthLabels: false, showTodayCount: false }), [primary], primary)
    expect(bounds).toEqual({ x: 100, y: 201, width: 320, height: 102 })
  })
})
