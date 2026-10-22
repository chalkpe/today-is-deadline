import { describe, expect, it } from 'vitest'
import { themeFromMatch } from './useTheme'

describe('themeFromMatch', () => {
  it('prefers-color-scheme: dark가 맞으면 다크, 아니면 라이트', () => {
    expect(themeFromMatch(true)).toBe('dark')
    expect(themeFromMatch(false)).toBe('light')
  })
})
