import { cn } from 'cn'
import type { ReactNode } from 'react'

export const CARD = 'rounded-lg border border-white/10 bg-white/[0.03]'

type Props = {
  heading?: string
  /** 제목 줄 오른쪽(범례 등) */
  aside?: ReactNode
  children: ReactNode
}

/** 통계 그림·목록을 담는 카드. 제목 줄 아래에 내용이 온다. */
export function Card({ heading, aside, children }: Props) {
  return (
    <section className={cn(CARD, 'flex min-w-0 flex-col gap-3 p-4')}>
      {(heading || aside) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          {heading && <h2 className="text-xs font-semibold text-neutral-400">{heading}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  )
}

/** 그림 자리에 대신 놓는 안내('기록 없음', '불러오지 못했습니다') */
export function EmptyCard({ children }: { children: ReactNode }) {
  return <div className={cn(CARD, 'flex h-48 items-center justify-center text-neutral-500')}>{children}</div>
}
