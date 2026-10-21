import { addDays, type DateKey, mondayOf } from '@shared/model/calendar'
import { type IntensityContext, intensityFor } from '@shared/model/intensity'
import type { DayTotal } from '@shared/model/stats'

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

/** 열 0은 항상, 이후 월요일의 달이 바뀌는 열마다 'n월' 라벨을 단다. */
export function monthLabels(columns: GridColumn[]): { column: number; label: string }[] {
  const labels: { column: number; label: string }[] = []
  columns.forEach((col, index) => {
    const month = col.monday.slice(5, 7)
    if (index === 0 || month !== columns[index - 1].monday.slice(5, 7)) labels.push({ column: index, label: `${Number(month)}월` })
  })
  return labels
}
