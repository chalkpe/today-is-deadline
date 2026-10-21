import { describe, expect, it } from 'vitest'
import { clampToDisplays } from './bounds'

const primary = { x: 0, y: 0, width: 1920, height: 1080 }

describe('clampToDisplays', () => {
  it('화면 밖이면 primary 안쪽으로 옮긴다', () => {
    expect(clampToDisplays({ x: 5000, y: 5000, width: 300, height: 100 }, [primary], primary)).toEqual({ x: 40, y: 40 })
  })
  it('오른쪽으로 걸친 창은 안으로 밀어 넣는다', () => {
    expect(clampToDisplays({ x: 1770, y: 100, width: 300, height: 100 }, [primary], primary)).toEqual({ x: 1620, y: 100 })
  })
  it('32px 미만으로 겹치면 화면 밖으로 본다', () => {
    expect(clampToDisplays({ x: 1900, y: 100, width: 300, height: 100 }, [primary], primary)).toEqual({ x: 40, y: 40 })
  })
  it('가장 많이 겹치는 display로 민다', () => {
    const second = { x: 1920, y: 0, width: 1920, height: 1080 }
    expect(clampToDisplays({ x: 1800, y: -50, width: 300, height: 100 }, [primary, second], primary)).toEqual({ x: 1920, y: 0 })
  })
  it('창이 display보다 크면 원점에 맞춘다', () => {
    expect(clampToDisplays({ x: 10, y: 10, width: 3000, height: 100 }, [primary], primary)).toEqual({ x: 0, y: 10 })
  })
})
