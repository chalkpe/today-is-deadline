import * as culori from 'culori'
import { describe, expect, it } from 'vitest'
import { cellColor, EMPTY_CELL, oklabDistance } from './cell'

describe('cellColor', () => {
  // 어두운 기준색(#1e3a8a)은 다크 배경과 명도 차가 작아 0.04를 넘기 어렵다(비율을 어떻게 잡아도 최대 약 0.0399).
  const minDistance = (theme: string, base: string) => (theme === 'dark' && base === '#1e3a8a' ? 0.03 : 0.04)
  const bases = ['#39d353', '#3b82f6', '#f97316', '#e11d48', '#1e3a8a']

  for (const theme of ['light', 'dark'] as const) {
    for (const base of bases) {
      it(`${theme} ${base}: 단계가 뚜렷하고 밝기가 ${theme === 'dark' ? '단조 증가' : '단조 감소'}한다`, () => {
        const steps = [0, 20, 40, 60, 80, 100].map((i) => cellColor(base, i, theme))
        expect(steps[0]).toBe(EMPTY_CELL[theme])
        expect(steps[5]).toBe(base)
        for (let i = 0; i < 5; i++) expect(oklabDistance(steps[i], steps[i + 1])).toBeGreaterThan(minDistance(theme, base))
        const lightness = steps.slice(1).map((c) => culori.oklab(c)?.l ?? Number.NaN)
        for (let i = 1; i < lightness.length; i++) {
          if (theme === 'dark') expect(lightness[i]).toBeGreaterThan(lightness[i - 1])
          else expect(lightness[i]).toBeLessThan(lightness[i - 1])
        }
      })
    }
  }

  it('100은 소문자 hex로 정규화한다', () => {
    expect(cellColor('#39D353', 100)).toBe('#39d353')
  })

  it('단계 사이 값과 범위 밖 값도 처리한다', () => {
    expect(cellColor('#39d353', 37)).toMatch(/^#[0-9a-f]{6}$/)
    expect(cellColor('#39d353', 5)).toBe(cellColor('#39d353', 20))
    expect(cellColor('#39d353', 150)).toBe('#39d353')
  })
})
