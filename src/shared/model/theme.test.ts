import { describe, expect, it } from 'vitest'
import { APPEARANCES, resolveTheme, themeSourceFor } from './theme'

describe('theme', () => {
  it('system은 OS 설정을 따른다', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
  it('light·dark는 OS 설정과 무관하다', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
  it('themeSourceFor는 항등이다', () => {
    for (const a of APPEARANCES) expect(themeSourceFor(a)).toBe(a)
  })
})
