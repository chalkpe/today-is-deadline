import { APP_PALETTE, OTHERS_COLOR } from '@renderer/shared/lib/color'
import { describe, expect, it } from 'vitest'
import { createColorRegistry } from './appColors'

describe('createColorRegistry', () => {
  it('이미 배정된 앱은 다른 기간에서도 같은 색, 처음 보는 앱은 아직 안 쓴 색', () => {
    const registry = createColorRegistry()
    const a = registry.colorsFor(['a', 'b'])
    expect(a.get('a')).toBe(APP_PALETTE[0])
    expect(a.get('b')).toBe(APP_PALETTE[1])
    const b = registry.colorsFor(['c', 'a'])
    expect(b.get('a')).toBe(APP_PALETTE[0])
    expect(b.get('c')).toBe(APP_PALETTE[2])
    expect([...b.keys()]).toEqual(['c', 'a'])
  })

  it('팔레트 4색이 다 쓰이면 다섯 번째 앱부터 기타색', () => {
    const registry = createColorRegistry()
    registry.colorsFor(['a', 'b', 'c'])
    const colors = registry.colorsFor(['d', 'e', 'a'])
    expect(colors.get('d')).toBe(APP_PALETTE[3])
    expect(colors.get('e')).toBe(OTHERS_COLOR)
    expect(colors.get('a')).toBe(APP_PALETTE[0])
    // 나중에 다시 와도 기타색 그대로, 앞서 받은 색도 그대로
    expect(registry.colorsFor(['e', 'b']).get('e')).toBe(OTHERS_COLOR)
    expect(registry.colorsFor(['e', 'b']).get('b')).toBe(APP_PALETTE[1])
  })

  it('레지스트리마다 따로 배정한다', () => {
    createColorRegistry().colorsFor(['x'])
    expect(createColorRegistry().colorsFor(['y']).get('y')).toBe(APP_PALETTE[0])
  })
})
