import { OTHERS_COLOR } from '@renderer/shared/lib/color'
import { cn } from 'cn'
import { barHeights, type Segment } from './charts'

export type Bar = {
  key: string
  /** 막대 높이의 기준. 조정이 들어간 날은 조각 합과 다를 수 있다 */
  total: number
  /** 아래부터 쌓는 앱별 조각(stackSegments) */
  segments: Segment[]
  /** 막대 아래 글자 */
  label?: string
  /** 누를 수 없고 흐리게(미래 날짜) */
  disabled?: boolean
}

type Props = {
  bars: Bar[]
  /** appId → 색. 없는 appId는 기타색 */
  colors: Map<string, string>
  /** 가장 큰 막대의 높이(px) */
  height: number
  /** 있으면 막대 칸 전체를 누를 수 있다 */
  onSelect?(key: string): void
}

/** 앱별 누적 막대. 막대 높이는 total, 막대 안 조각은 조각 합 대비 비율로 채운다(조각이 없으면 회색 막대). */
export function StackedBars({ bars, colors, height, onSelect }: Props) {
  const heights = barHeights(
    bars.map((bar) => bar.total),
    height,
  )
  const columns = bars.map((bar, i) => ({ ...bar, px: heights[i], sum: bar.segments.reduce((sum, s) => sum + s.count, 0) }))
  return (
    <div className="flex gap-1">
      {columns.map((bar) => {
        const content = (
          <>
            <div className="flex w-full flex-col justify-end" style={{ height }}>
              <div
                className="mx-auto flex w-full max-w-12 flex-col-reverse overflow-hidden rounded-t-[3px] bg-neutral-500"
                style={{ height: bar.px }}
              >
                {bar.segments.map((segment) => (
                  <div
                    key={segment.appId}
                    className="shrink-0"
                    style={{ height: `${(segment.count / bar.sum) * 100}%`, background: colors.get(segment.appId) ?? OTHERS_COLOR }}
                  />
                ))}
              </div>
            </div>
            {bar.label && <span className="text-[11px] leading-none text-neutral-500">{bar.label}</span>}
          </>
        )
        const column = 'flex min-w-0 flex-1 flex-col items-center gap-1.5'
        if (!onSelect) {
          return (
            <div key={bar.key} className={column}>
              {content}
            </div>
          )
        }
        return (
          <button
            type="button"
            key={bar.key}
            disabled={bar.disabled}
            className={cn(column, 'rounded-md p-0 transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40')}
            onClick={() => onSelect(bar.key)}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
