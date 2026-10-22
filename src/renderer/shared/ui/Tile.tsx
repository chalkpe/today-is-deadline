import { changeRatio } from '@shared/model/stats'
import { cn } from 'cn'
import type { ReactNode } from 'react'
import { CARD } from './Card'

type Props = {
  label: string
  value: ReactNode
  /** 값 아래의 작은 글씨. 여러 줄이면 자식마다 한 줄 */
  sub?: ReactNode
}

/** 숫자 타일: 이름 · 큰 값 · 작은 보조 글 */
export function Tile({ label, value, sub }: Props) {
  return (
    <div className={cn(CARD, 'flex min-w-0 flex-col gap-1 px-4 py-3')}>
      <span className="text-xs text-fg-muted">{label}</span>
      <span className="truncate text-lg font-semibold text-fg tabular-nums">{value}</span>
      {sub && <div className="flex flex-col gap-0.5 text-xs text-fg-muted">{sub}</div>}
    </div>
  )
}

type CompareProps = { label: string; current: number; previous: number }

/** "어제보다 +12%". 증가는 초록, 감소는 빨강, 이전 기간이 0이면 "–" */
export function Compare({ label, current, previous }: CompareProps) {
  const ratio = changeRatio(current, previous)
  const tone = ratio === null || ratio === 0 ? 'text-fg-muted' : ratio > 0 ? 'text-emerald-400' : 'text-rose-400'
  return (
    <span>
      {`${label} `}
      <span className={tone}>{ratio === null ? '–' : `${ratio > 0 ? '+' : ''}${ratio}%`}</span>
    </span>
  )
}
