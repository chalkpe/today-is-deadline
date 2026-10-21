import { addDays, type DateKey, mondayOf } from '@shared/model/calendar'
import { type IntensityContext, intensityFor } from '@shared/model/intensity'
import { type DayDetail, type DayTotal, foldApps } from '@shared/model/stats'

export type GridCell = { date: DateKey; total: number; intensity: number; future: boolean; isToday: boolean }
export type GridColumn = { monday: DateKey; cells: GridCell[] } // 항상 7개

/** 범위가 걸친 주마다 월~일 7칸짜리 열을 만든다. */
export function buildGrid(
  totals: DayTotal[],
  range: { start: DateKey; end: DateKey },
  today: DateKey,
  ctx: IntensityContext,
): GridColumn[] {
  const byDate = new Map(totals.map((t) => [t.date, t.total]))
  const lastMonday = mondayOf(range.end)
  const columns: GridColumn[] = []
  for (let monday = mondayOf(range.start); monday <= lastMonday; monday = addDays(monday, 7)) {
    const cells: GridCell[] = []
    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i)
      const total = byDate.get(date) ?? 0
      cells.push({ date, total, intensity: intensityFor(total, ctx), future: date > today, isToday: date === today })
    }
    columns.push({ monday, cells })
  }
  return columns
}

export function relativeMax(totals: DayTotal[]): number {
  return totals.reduce((max, t) => Math.max(max, t.total), 0)
}

/** 열 0 라벨과 다음 라벨 사이에 필요한 최소 열 간격. 12px 간격에서 2열 안이면 글자가 겹친다. */
const FIRST_LABEL_MIN_GAP = 3

/** 월요일의 달이 바뀌는 열마다 'n월' 라벨을 단다. 열 0은 다음 라벨과 겹치지 않을 때만 단다. */
export function monthLabels(columns: GridColumn[]): { column: number; label: string }[] {
  const labels: { column: number; label: string }[] = []
  columns.forEach((col, index) => {
    const month = col.monday.slice(5, 7)
    if (index === 0 || month !== columns[index - 1].monday.slice(5, 7)) labels.push({ column: index, label: `${Number(month)}월` })
  })
  if (labels.length > 1 && labels[1].column < FIRST_LABEL_MIN_GAP) labels.shift()
  return labels
}

/** 상세 패널의 앱 행 수(접힌 '기타' 행 포함). widgetHeight의 detailRows에 넘긴다. */
export function detailRowCount(detail: DayDetail): number {
  const { shown, others } = foldApps(detail.apps, 5)
  return shown.length + (others ? 1 : 0)
}
