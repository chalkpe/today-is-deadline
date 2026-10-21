import { describe, expect, it } from 'vitest'
import { intensityFixed, intensityFor, intensityRelative } from './intensity'

const t = [1000, 2000, 3000, 4000] as const

describe('intensityFixed', () => {
  it('구간별 강도를 돌려준다', () => {
    expect(intensityFixed(0, t)).toBe(0)
    expect(intensityFixed(1, t)).toBe(20)
    expect(intensityFixed(999, t)).toBe(20)
    expect(intensityFixed(1000, t)).toBe(40)
    expect(intensityFixed(3999, t)).toBe(80)
    expect(intensityFixed(4000, t)).toBe(100)
    expect(intensityFixed(99999, t)).toBe(100)
  })
})

describe('intensityRelative', () => {
  it('0 또는 20~100 정수를 돌려준다', () => {
    expect(intensityRelative(0, 100)).toBe(0)
    expect(intensityRelative(1, 10000)).toBe(20)
    expect(intensityRelative(50, 100)).toBe(50)
    expect(intensityRelative(100, 100)).toBe(100)
    expect(intensityRelative(5, 0)).toBe(0)
  })
})

describe('intensityFor', () => {
  it('모드에 따라 위임한다', () => {
    expect(intensityFor(1500, { mode: 'fixed', thresholds: t })).toBe(40)
    expect(intensityFor(50, { mode: 'relative', max: 100 })).toBe(50)
  })
})
