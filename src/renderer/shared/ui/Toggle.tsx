import { cn } from 'cn'
import type { ReactNode } from 'react'

type Props = { label: ReactNode; checked: boolean; onChange(checked: boolean): void; className?: string }

/** 이름은 왼쪽, 스위치는 오른쪽. 실제 입력은 숨긴 체크박스이고 행 전체를 눌러 켜고 끈다. */
export function Toggle({ label, checked, onChange, className }: Props) {
  return (
    <label className={cn('flex cursor-pointer items-center justify-between gap-4', className)}>
      <span className="text-fg">{label}</span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="relative h-5 w-9 shrink-0 rounded-full bg-fg-muted/50 transition-colors peer-checked:bg-emerald-500 peer-checked:*:translate-x-4">
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform" />
      </span>
    </label>
  )
}
