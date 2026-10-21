import { cn } from 'cn'
import type { ReactNode } from 'react'

type Props = {
  label: ReactNode
  /** 입력 아래의 회색 도움말 */
  hint?: ReactNode
  /** 입력 아래의 빨간 오류 */
  error?: string | null
  /** 이름을 왼쪽, 입력을 오른쪽에 한 줄로 둔다(좁으면 다음 줄로 넘긴다). 기본은 이름 아래에 입력 */
  inline?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, hint, error, inline = false, className, children }: Props) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className={cn('flex gap-1.5', inline ? 'flex-wrap items-center justify-between gap-x-4' : 'flex-col')}>
        <span className="text-neutral-300">{label}</span>
        {children}
      </div>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
