import { cn } from 'cn'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { INPUT } from './TextInput'

type Props = { value: number; onCommit(text: string): void; min?: number; max?: number; step?: number; className?: string }

/**
 * 키를 누를 때마다가 아니라 브라우저 change(포커스 이탈·Enter·스피너)에서만 onCommit을 부른다.
 * 입력 중인 글자는 따로 들고 있다가 커밋하면 버리고 value를 다시 보여 준다. 그래서 부모가 값을 거부하면 이전 값으로 돌아간다.
 */
export function NumberInput({ value, onCommit, min, max, step, className }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<string | null>(null)

  const commit = useEffectEvent((text: string) => {
    setDraft(null)
    onCommit(text)
  })
  useEffect(() => {
    const input = ref.current
    if (!input) return
    // React의 onChange는 input 이벤트라 네이티브 change를 직접 듣는다
    const onChange = () => commit(input.value)
    input.addEventListener('change', onChange)
    return () => input.removeEventListener('change', onChange)
  }, [])

  return (
    <input
      ref={ref}
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft ?? String(value)}
      onChange={(event) => setDraft(event.target.value)}
      // 값을 바꾸지 않고 떠나면 change가 오지 않으므로 여기서 입력 중인 글자를 버린다
      onBlur={() => setDraft(null)}
      onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      className={cn(INPUT, 'w-20 text-right tabular-nums', className)}
    />
  )
}
