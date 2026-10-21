export type FixedThresholds = readonly [number, number, number, number]

export const INTENSITY_FLOOR = 20

export function intensityFixed(count: number, t: FixedThresholds): 0 | 20 | 40 | 60 | 80 | 100 {
  if (count <= 0) return 0
  if (count < t[0]) return 20
  if (count < t[1]) return 40
  if (count < t[2]) return 60
  if (count < t[3]) return 80
  return 100
}

/** 0 또는 20~100 정수 */
export function intensityRelative(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0
  return Math.min(100, Math.max(INTENSITY_FLOOR, Math.round((count / max) * 100)))
}

export type IntensityContext = { mode: 'relative'; max: number } | { mode: 'fixed'; thresholds: FixedThresholds }

export function intensityFor(count: number, ctx: IntensityContext): number {
  return ctx.mode === 'fixed' ? intensityFixed(count, ctx.thresholds) : intensityRelative(count, ctx.max)
}
