import { FOOTER_HEIGHT } from '@shared/model/layout'
import { formatCount, type TodayStats } from '@shared/model/stats'

type Props = { today: TodayStats; onClick(): void }

export function Footer({ today, onClick }: Props) {
  return (
    <button
      type="button"
      className="flex w-full items-end p-0 text-left text-[11px] text-neutral-300"
      style={{ height: FOOTER_HEIGHT }}
      onClick={onClick}
    >
      {`오늘 ${formatCount(today.total)}타 · 이번 주 ${formatCount(today.weekTotal)}타`}
    </button>
  )
}
