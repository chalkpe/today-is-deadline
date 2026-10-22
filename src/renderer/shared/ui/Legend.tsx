import type { LegendItem } from './charts'

/** 색 견본 + 이름. 좁으면 다음 줄로 넘긴다. */
export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-fg-muted">
      {items.map((item) => (
        <span key={item.key} className="flex min-w-0 items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-sm" style={{ background: item.color }} />
          <span className="max-w-40 truncate">{item.label}</span>
        </span>
      ))}
    </div>
  )
}
