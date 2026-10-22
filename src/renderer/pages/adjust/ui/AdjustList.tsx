import { formatDelta } from '@renderer/features/adjust-form'
import { Button } from '@renderer/shared/ui/Button'
import { formatDateKo } from '@shared/model/calendar'
import type { Adjustment } from '@shared/model/stats'
import { cn } from 'cn'

type Props = { items: readonly Adjustment[]; onRemove(id: number): void }

/** 조정 내역(main이 최근순으로 준다). 각 행이 Section 카드의 한 줄이다. */
export function AdjustList({ items, onRemove }: Props) {
  if (items.length === 0) return <p className="text-fg-muted">조정 내역이 없습니다</p>
  return items.map((item) => (
    <div key={item.id} className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-fg">{formatDateKo(item.date)}</span>
      <span
        className={cn(
          'min-w-16 shrink-0 text-right tabular-nums',
          item.delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
        )}
      >
        {formatDelta(item.delta)}
      </span>
      <span className="min-w-0 flex-1 truncate text-fg-muted">{item.memo}</span>
      <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)}>
        삭제
      </Button>
    </div>
  ))
}
