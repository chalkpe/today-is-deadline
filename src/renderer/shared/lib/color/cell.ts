import { formatHex, interpolate, oklab } from 'culori'

export const WIDGET_BACKGROUND = '#1a1a1e'
export const EMPTY_CELL_COLOR = '#2c2c31'

/** 강도 20일 때 배경에서 기준색 쪽으로 이동하는 비율 */
const START_RATIO = 0.3

export function cellColor(baseColor: string, intensity: number): string {
  if (intensity <= 0) return EMPTY_CELL_COLOR
  const base = formatHex(baseColor) ?? baseColor
  const clamped = Math.min(100, Math.max(20, intensity))
  if (clamped >= 100) return base
  const t = START_RATIO + ((1 - START_RATIO) * (clamped - 20)) / 80
  return formatHex(interpolate([WIDGET_BACKGROUND, base], 'oklab')(t))
}

export function oklabDistance(a: string, b: string): number {
  const x = oklab(a)
  const y = oklab(b)
  if (!x || !y) return Number.NaN
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b)
}
