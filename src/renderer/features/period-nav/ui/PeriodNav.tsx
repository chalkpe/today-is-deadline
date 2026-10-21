import { Button } from '@renderer/shared/ui/Button'
import type { DateKey } from '@shared/model/calendar'
import { canGoForward, current, type Period, shift, type Tab, title } from '../model/period'

const CURRENT_LABEL: Record<Tab, string> = { day: '오늘', week: '이번 주', month: '이번 달' }

type Props = { period: Period; today: DateKey; onChange(period: Period): void }

/** ◀ 제목 ▶ + 오늘로 돌아가기. 오늘을 품는 기간에서는 ▶와 돌아가기를 끈다. */
export function PeriodNav({ period, today, onChange }: Props) {
  const forward = canGoForward(period, today)
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" onClick={() => onChange(shift(period, -1, today))}>
        ◀
      </Button>
      <span className="min-w-0 flex-1 truncate text-center text-base font-semibold text-neutral-100">{title(period)}</span>
      <Button variant="ghost" disabled={!forward} onClick={() => onChange(shift(period, 1, today))}>
        ▶
      </Button>
      <Button disabled={!forward} onClick={() => onChange(current(period.tab, today))}>
        {CURRENT_LABEL[period.tab]}
      </Button>
    </div>
  )
}
