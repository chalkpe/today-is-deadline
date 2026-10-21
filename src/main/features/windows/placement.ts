import { widgetHeight } from '@shared/model/layout'
import type { Settings } from '@shared/model/settings'
import { clampToDisplays, type Rect } from './bounds'

/** 저장된 위치가 없을 때 주 디스플레이 오른쪽 위에서 띄우는 여백 */
export const WIDGET_MARGIN = 24

/**
 * 위젯 창의 첫 경계. 너비는 설정, 높이는 펼침 없는 widgetHeight.
 * 위치는 저장된 값(없으면 주 디스플레이 오른쪽 위)을 clampToDisplays로 화면 안에 맞춘다.
 */
export function widgetBounds(settings: Settings, displays: Rect[], primary: Rect): Rect {
  const width = Math.round(settings.widget.width)
  const height = widgetHeight({
    showMonthLabels: settings.heatmap.showMonthLabels,
    showTodayCount: settings.heatmap.showTodayCount,
    detailRows: 0,
  })
  const { x, y } = settings.widget
  const wanted =
    x === null || y === null
      ? { x: primary.x + primary.width - width - WIDGET_MARGIN, y: primary.y + WIDGET_MARGIN }
      : { x: Math.round(x), y: Math.round(y) }
  return { ...clampToDisplays({ ...wanted, width, height }, displays, primary), width, height }
}
