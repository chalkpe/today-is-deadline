type Props = { value: string; onChange(value: string): void }

/** 색 견본 + hex 값. 색 선택기에서 끄는 동안에도 onChange가 계속 온다. */
export function ColorInput({ value, onChange }: Props) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <span className="font-mono text-xs text-neutral-400">{value}</span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 w-10 cursor-pointer rounded-md border border-white/10 bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0"
      />
    </label>
  )
}
