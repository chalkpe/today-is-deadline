import type { ReactNode } from 'react'

type Props = {
  heading: string
  description?: ReactNode
  /** 묶음 아래에 빨간 글씨로 보여 줄 오류 */
  errors?: readonly string[]
  children: ReactNode
}

/** 제목 + 줄로 나뉜 카드. 카드의 각 자식이 한 행이 된다. */
export function Section({ heading, description, errors, children }: Props) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5 px-1">
        <h2 className="text-xs font-semibold text-fg-muted">{heading}</h2>
        {description && <p className="text-xs text-fg-muted">{description}</p>}
      </div>
      <div className="flex flex-col divide-y divide-card-border rounded-lg border border-card-border bg-surface px-4 *:py-3">
        {children}
      </div>
      {errors?.map((error) => (
        <p key={error} className="px-1 text-xs text-red-400">
          {error}
        </p>
      ))}
    </section>
  )
}
