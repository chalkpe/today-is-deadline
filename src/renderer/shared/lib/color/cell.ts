import { formatHex, interpolate, oklab } from 'culori'
import type { Theme } from '../../../../shared/model/theme'

export const THEME_BACKGROUND: Record<Theme, string> = { light: '#ffffff', dark: '#1a1a1e' }
export const EMPTY_CELL: Record<Theme, string> = { light: '#e6e6ea', dark: '#2c2c31' }

/** @deprecated Task 3에서 제거 */
export const WIDGET_BACKGROUND = THEME_BACKGROUND.dark
/** @deprecated Task 3에서 제거 */
export const EMPTY_CELL_COLOR = EMPTY_CELL.dark

/** 강도 20일 때 배경에서 기준색 쪽으로 이동하는 비율. 밝은 배경은 빈 칸과 구분되도록 더 크게 잡는다. */
const START_RATIO: Record<Theme, number> = { dark: 0.3, light: 0.4 }

export function cellColor(baseColor: string, intensity: number, theme: Theme = 'dark'): string {
  if (intensity <= 0) return EMPTY_CELL[theme]
  const base = formatHex(baseColor) ?? baseColor
  const clamped = Math.min(100, Math.max(20, intensity))
  if (clamped >= 100) return base
  const start = START_RATIO[theme]
  const t = start + ((1 - start) * (clamped - 20)) / 80
  return formatHex(interpolate([THEME_BACKGROUND[theme], base], 'oklab')(t))
}

export function oklabDistance(a: string, b: string): number {
  const x = oklab(a)
  const y = oklab(b)
  if (!x || !y) return Number.NaN
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b)
}
