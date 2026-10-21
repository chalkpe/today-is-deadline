import { describe, expect, it } from 'vitest'
import {
  type AppShare,
  changeRatio,
  foldApps,
  formatCount,
  formatDuration,
  formatMinute,
  formatPercent,
  longestGap,
  topAppIds,
} from './stats'

const apps = (n: number): AppShare[] =>
  Array.from({ length: n }, (_, i) => ({ appId: `a${i}`, name: `A${i}`, count: 100 - i * 10, ratio: 0.1 }))

describe('changeRatio', () => {
  it('증감률을 정수 퍼센트로 돌려준다', () => {
    expect(changeRatio(112, 100)).toBe(12)
    expect(changeRatio(90, 100)).toBe(-10)
    expect(changeRatio(5, 0)).toBeNull()
  })
})

describe('foldApps', () => {
  it('top 초과분을 기타로 묶는다', () => {
    const r = foldApps(apps(7), 5)
    expect(r.shown).toHaveLength(5)
    expect(r.others?.appCount).toBe(2)
    expect(r.others?.count).toBe(50 + 40)
  })

  it('top 이하면 others가 null이다', () => {
    expect(foldApps(apps(5), 5).others).toBeNull()
  })
})

describe('topAppIds', () => {
  it('상위 n개 id', () => {
    expect(topAppIds(apps(4), 2)).toEqual(['a0', 'a1'])
  })
})

describe('longestGap', () => {
  it('가장 긴 공백을 돌려준다', () => {
    expect(longestGap([730, 795, 800])).toEqual({ minutes: 65, from: 730, to: 795 })
    expect(longestGap([10])).toBeNull()
  })
})

describe('포맷', () => {
  it('값을 한국어 표기로 바꾼다', () => {
    expect(formatCount(7812)).toBe('7,812')
    expect(formatDuration(252)).toBe('4시간 12분')
    expect(formatDuration(35)).toBe('35분')
    expect(formatDuration(0)).toBe('0분')
    expect(formatDuration(120)).toBe('2시간')
    expect(formatMinute(730)).toBe('12:10')
    expect(formatPercent(0.534)).toBe('53%')
  })
})
