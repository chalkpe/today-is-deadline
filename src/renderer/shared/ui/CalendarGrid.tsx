import { cellColor } from '@renderer/shared/lib/color'
import { type DateKey, type MonthKey, WEEKDAYS_KO, weekdayIndex } from '@shared/model/calendar'
import { type IntensityContext, intensityFor } from '@shared/model/intensity'
import { type DayTotal, formatCount } from '@shared/model/stats'
import { cn } from 'cn'

/** 1일이 놓일 열(월요일 = 1). Tailwind가 찾을 수 있게 클래스 이름을 그대로 적는다. */
const COL_START = ['col-start-1', 'col-start-2', 'col-start-3', 'col-start-4', 'col-start-5', 'col-start-6', 'col-start-7']

type Props = {
  month: MonthKey
  /** 그 달의 모든 날짜(1일부터) */
  days: DayTotal[]
  ctx: IntensityContext
  baseColor: string
  today: DateKey
  onSelect(date: DateKey): void
}

/** 월~일 열의 달력. 칸마다 날짜와 그날 합계, 배경은 강도 색. 미래 날짜는 흐리고 누를 수 없다. */
export function CalendarGrid({ month, days, ctx, baseColor, today, onSelect }: Props) {
  const offset = weekdayIndex(`${month}-01`)
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAYS_KO.map((label) => (
        <span key={label} className="pb-1 text-center text-xs text-neutral-500">
          {label}
        </span>
      ))}
      {days.map((day, i) => {
        const future = day.date > today
        return (
          <button
            type="button"
            key={day.date}
            disabled={future}
            className={cn(
              'flex h-14 min-w-0 flex-col justify-between rounded-md p-1.5 text-left text-xs text-neutral-100 text-shadow-xs text-shadow-black/60 transition-shadow',
              'hover:ring-2 hover:ring-white/50 disabled:pointer-events-none disabled:opacity-30',
              i === 0 && COL_START[offset],
              day.date === today && 'ring-1 ring-white/70',
            )}
            style={{ background: cellColor(baseColor, intensityFor(day.total, ctx)) }}
            onClick={() => onSelect(day.date)}
          >
            <span>{Number(day.date.slice(8))}</span>
            {/* 미래 날짜는 아직 기록이 없으므로 합계를 쓰지 않는다 */}
            {!future && <span className="self-end truncate tabular-nums">{formatCount(day.total)}</span>}
          </button>
        )
      })}
    </div>
  )
}
