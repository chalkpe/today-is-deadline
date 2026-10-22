import { cn } from 'cn'
import type { ComponentProps } from 'react'

const VARIANT = {
  default: 'bg-control-border/60 text-fg hover:bg-control-border',
  primary: 'bg-emerald-600 text-white hover:bg-emerald-500',
  ghost: 'text-fg-muted hover:bg-control-border/60 hover:text-fg',
} as const

const SIZE = { md: 'h-8 px-3', sm: 'h-6 px-2 text-xs' } as const

type Props = ComponentProps<'button'> & { variant?: keyof typeof VARIANT; size?: keyof typeof SIZE }

/** 기본 type은 button이다. 폼 제출 버튼은 type="submit"을 넘긴다. */
export function Button({ variant = 'default', size = 'md', className, ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-50',
        SIZE[size],
        VARIANT[variant],
        className,
      )}
    />
  )
}
