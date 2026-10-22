import { cn } from 'cn'
import type { ReactNode } from 'react'

type Option<T extends string> = { value: T; label: ReactNode }
type Props<T extends string> = { value: T; options: readonly Option<T>[]; onChange(value: T): void }

/** 붙어 있는 탭 버튼 묶음. 고른 탭을 다시 누르면 onChange를 부르지 않는다. */
export function Tabs<T extends string>({ value, options, onChange }: Props<T>) {
  return (
    <div className="flex self-start rounded-lg bg-cell-empty p-0.5">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={cn(
            'h-7 rounded-md px-5 transition-colors',
            option.value === value ? 'bg-control-border text-fg' : 'text-fg-muted hover:text-fg',
          )}
          onClick={() => option.value !== value && onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
