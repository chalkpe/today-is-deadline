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
/**
 * 권한 안내 화면(macOS 입력 모니터링 거부)의 창 높이. 최소 너비(140)에서 잰 내용은 문구 6줄(줄 높이 약 15) + 간격 8 + 세로로 쌓은
 * 버튼 두 개(23 + 4 + 23) = 149, 여기에 패널 여백 20을 더하면 169다. 글꼴 렌더링 차이로 한 줄이 더 늘어도 들어가게 한 줄만큼 여유를 둔다.
 */
export const PERMISSION_NOTICE_HEIGHT = 184

type HeightOptions = { showMonthLabels: boolean; showTodayCount: boolean; detailRows: number }

export function widgetHeight(opts: HeightOptions): number {
  return (
    PANEL_PADDING * 2 +
    7 * CELL +
    6 * GAP +
    (opts.showMonthLabels ? MONTH_LABEL_HEIGHT : 0) +
    (opts.showTodayCount ? FOOTER_HEIGHT : 0) +
    (opts.detailRows > 0 ? DETAIL_HEADER_HEIGHT + opts.detailRows * DETAIL_ROW_HEIGHT : 0)
  )
}

/** 지금 그리는 화면의 창 높이. 권한이 거부되면 권한 안내 높이, 아니면 widgetHeight. main의 첫 창 높이도 같은 함수로 정한다. */
export function panelHeight(opts: HeightOptions & { denied: boolean }): number {
  return opts.denied ? PERMISSION_NOTICE_HEIGHT : widgetHeight(opts)
}
