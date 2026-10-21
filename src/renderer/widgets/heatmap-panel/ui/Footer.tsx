import { FOOTER_HEIGHT } from '@shared/model/layout'
import { formatCount, type TodayStats } from '@shared/model/stats'

type Props = { today: TodayStats; onClick(): void }

export function Footer({ today, onClick }: Props) {
  return (
    <button
      type="button"
      className="flex w-full min-w-0 items-end p-0 text-left text-[11px] text-neutral-300"
      style={{ height: FOOTER_HEIGHT }}
      onClick={onClick}
    >
      {/* 한 줄을 넘으면 FOOTER_HEIGHT 밖으로 넘치므로 말줄임한다 */}
      <span className="truncate">{`오늘 ${formatCount(today.total)}타 · 이번 주 ${formatCount(today.weekTotal)}타`}</span>
    </button>
  )
}
