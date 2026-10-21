import { cn } from 'cn'
import type { ComponentProps } from 'react'

/** 글자·숫자·날짜 입력 공통 모양 */
export const INPUT =
  'h-8 rounded-md border border-white/10 bg-neutral-900 px-2 text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-white/30'

/** 기본 type은 text다. 날짜 입력은 type="date"를 넘긴다. */
export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return <input type="text" {...props} className={cn(INPUT, className)} />
}
