import type { ReactNode } from 'react'

type Option<T extends string> = { value: T; label: ReactNode }
type Props<T extends string> = {
  name: string
  /** null이면 아무것도 고르지 않은 상태로 그린다 */
  value: T | null
  options: readonly Option<T>[]
  onChange(value: T): void
}

export function RadioGroup<T extends string>({ name, value, options, onChange }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {options.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-center gap-1.5 text-neutral-300">
          <input
            type="radio"
            name={name}
            className="accent-emerald-500"
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}
