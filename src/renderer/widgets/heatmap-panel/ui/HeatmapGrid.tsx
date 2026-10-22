import { type GridColumn, monthLabels } from '@renderer/entities/day-stat'
import { cellColor } from '@renderer/shared/lib/color'
import type { DateKey } from '@shared/model/calendar'
import { CELL, DOW_LABEL_WIDTH, GAP, MONTH_LABEL_HEIGHT, PITCH } from '@shared/model/layout'
import type { Theme } from '@shared/model/theme'
import { cn } from 'cn'

type Props = {
  columns: GridColumn[]
  baseColor: string
  theme: Theme
  showDayLabels: boolean
  showMonthLabels: boolean
  selected: DateKey | null
  onSelect(date: DateKey | null): void
}

const ROWS = [0, 1, 2, 3, 4, 5, 6]
const DAY_LABELS: Record<number, string> = { 0: '월', 2: '수', 4: '금' }

export function HeatmapGrid({ columns, baseColor, theme, showDayLabels, showMonthLabels, selected, onSelect }: Props) {
  const labels = showMonthLabels ? monthLabels(columns) : []
  const offset = showDayLabels ? DOW_LABEL_WIDTH : 0
  return (
    <div className="flex flex-col text-[9px] leading-none text-fg-muted">
      {showMonthLabels && (
        <div className="relative" style={{ height: MONTH_LABEL_HEIGHT }}>
          {labels.map(({ column, label }) => (
            <span key={column} className="absolute top-0" style={{ left: offset + column * PITCH }}>
              {label}
            </span>
          ))}
        </div>
      )}
      <div className="flex" style={{ gap: GAP }}>
        {showDayLabels && (
          <div className="grid shrink-0" style={{ width: DOW_LABEL_WIDTH - GAP, gridTemplateRows: `repeat(7, ${CELL}px)`, rowGap: GAP }}>
            {ROWS.map((row) => (
              <span key={row} className="flex items-center">
                {DAY_LABELS[row]}
              </span>
            ))}
          </div>
        )}
        <div className="grid grid-flow-col" style={{ gridTemplateRows: `repeat(7, ${CELL}px)`, gridAutoColumns: `${CELL}px`, gap: GAP }}>
          {columns.flatMap((column) =>
            column.cells.map((cell) => (
              <button
                type="button"
                key={cell.date}
                className={cn(
                  'block rounded-[2px] p-0',
                  cell.future && 'invisible',
                  // 패널의 포커스 링 끄기(outline-none)에 지지 않게 선 모양만 important로 건다
                  selected === cell.date && 'outline-2 outline-solid! outline-outline',
                )}
                style={{ background: cellColor(baseColor, cell.intensity, theme) }}
                onClick={() => !cell.future && onSelect(selected === cell.date ? null : cell.date)}
              />
            )),
          )}
        </div>
      </div>
    </div>
  )
}
