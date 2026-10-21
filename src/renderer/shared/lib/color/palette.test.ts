import { describe, expect, it } from 'vitest'
import { APP_PALETTE, assignAppColors, OTHERS_COLOR } from './palette'

describe('assignAppColors', () => {
  it('앞에서부터 팔레트를 배정하고 5번째부터 기타색을 쓴다', () => {
    const colors = assignAppColors(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(colors.get('a')).toBe(APP_PALETTE[0])
    expect(colors.get('d')).toBe(APP_PALETTE[3])
    expect(colors.get('e')).toBe(OTHERS_COLOR)
    expect(colors.get('f')).toBe(OTHERS_COLOR)
  })
})
