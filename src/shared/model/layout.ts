// 위젯 치수. renderer·main 공용이며 다른 곳에 같은 공식을 두지 않는다.
export const CELL = 10
export const GAP = 2
export const PITCH = 12
export const PANEL_PADDING = 10
export const PANEL_BORDER = 1 // PANEL_PADDING 안에 포함된다
export const DOW_LABEL_WIDTH = 16
export const MONTH_LABEL_HEIGHT = 14
export const FOOTER_HEIGHT = 22
export const MIN_WEEKS = 8
export const MAX_WEEKS = 57 // heatmap:range 400일 상한 안: 오늘이 일요일이어도 57주 = 399일
export const DETAIL_HEADER_HEIGHT = 34
export const DETAIL_ROW_HEIGHT = 18

export function widgetHeight(opts: { showMonthLabels: boolean; showTodayCount: boolean; detailRows: number }): number {
  return (
    PANEL_PADDING * 2 +
    7 * CELL +
    6 * GAP +
    (opts.showMonthLabels ? MONTH_LABEL_HEIGHT : 0) +
    (opts.showTodayCount ? FOOTER_HEIGHT : 0) +
    (opts.detailRows > 0 ? DETAIL_HEADER_HEIGHT + opts.detailRows * DETAIL_ROW_HEIGHT : 0)
  )
}
