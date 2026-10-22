import { cn } from 'cn'
import type { ComponentProps } from 'react'

/** 글자·숫자·날짜 입력 공통 모양 */
export const INPUT =
  'h-8 rounded-md border border-control-border bg-page px-2 text-fg outline-none placeholder:text-fg-muted focus:border-fg-muted'

/** 기본 type은 text다. 날짜 입력은 type="date"를 넘긴다. */
export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return <input type="text" {...props} className={cn(INPUT, className)} />
}
