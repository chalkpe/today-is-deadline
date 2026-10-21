import { APP_PALETTE, OTHERS_COLOR } from '@renderer/shared/lib/color'
import type { AppShare } from '@shared/model/stats'
import { describe, expect, it } from 'vitest'
import { appColors, barHeights, gridIntensities, legendItems, OTHERS_ID, stackSegments, stripIntensities } from './charts'

describe('stackSegments', () => {
  it('상위 앱 순서대로 쌓고 나머지는 others로 묶는다', () => {
    expect(stackSegments({ a: 5, b: 3, c: 1, d: 1, e: 2 }, ['a', 'b', 'c', 'd'])).toEqual([
      { appId: 'a', count: 5 },
      { appId: 'b', count: 3 },
      { appId: 'c', count: 1 },
      { appId: 'd', count: 1 },
      { appId: OTHERS_ID, count: 2 },
    ])
  })

  it('나머지가 0이면 others를 생략한다', () => {
    expect(stackSegments({ a: 5, b: 3 }, ['a', 'b'])).toEqual([
      { appId: 'a', count: 5 },
      { appId: 'b', count: 3 },
    ])
  })

  it('이 칸에 없는 상위 앱은 건너뛴다', () => {
    expect(stackSegments({ b: 2, z: 1 }, ['a', 'b'])).toEqual([
      { appId: 'b', count: 2 },
      { appId: OTHERS_ID, count: 1 },
    ])
    expect(stackSegments({}, ['a'])).toEqual([])
  })
})

describe('barHeights', () => {
  it('전부 0이면 모두 0', () => {
    expect(barHeights([0, 0], 100)).toEqual([0, 0])
    expect(barHeights([], 100)).toEqual([])
  })

  it('최댓값 대비 비율로 px을 정한다', () => {
    expect(barHeights([50, 100, 0], 200)).toEqual([100, 200, 0])
  })

  it('0이 아닌 값은 최소 1px', () => {
    expect(barHeights([1, 1000], 100)).toEqual([1, 100])
  })
})

describe('stripIntensities', () => {
  it('띠 안의 최댓값 기준 상대 강도', () => {
    expect(stripIntensities([0, 5, 10])).toEqual([0, 50, 100])
    expect(stripIntensities([1, 100])).toEqual([20, 100])
    expect(stripIntensities([0, 0])).toEqual([0, 0])
  })
})

describe('gridIntensities', () => {
  it('격자 전체의 최댓값 기준 상대 강도', () => {
    expect(
      gridIntensities([
        [0, 10],
        [5, 20],
      ]),
    ).toEqual([
      [0, 50],
      [25, 100],
    ])
    expect(gridIntensities([[0], [0]])).toEqual([[0], [0]])
  })
})

describe('appColors · legendItems', () => {
  const app = (appId: string, name: string): AppShare => ({ appId, name, count: 1, ratio: 0.2 })

  it('상위 앱은 팔레트, others는 기타색', () => {
    const colors = appColors(['a', 'b'])
    expect(colors.get('a')).toBe(APP_PALETTE[0])
    expect(colors.get('b')).toBe(APP_PALETTE[1])
    expect(colors.get(OTHERS_ID)).toBe(OTHERS_COLOR)
  })

  it('범례는 상위 앱 이름 순서이고 다른 앱이 있으면 기타를 붙인다', () => {
    const apps = [app('a', '코드'), app('b', '브라우저'), app('c', '메모')]
    expect(legendItems(apps, ['a', 'b'])).toEqual([
      { key: 'a', label: '코드', color: APP_PALETTE[0] },
      { key: 'b', label: '브라우저', color: APP_PALETTE[1] },
      { key: OTHERS_ID, label: '기타', color: OTHERS_COLOR },
    ])
    expect(legendItems(apps.slice(0, 2), ['a', 'b']).map((item) => item.key)).toEqual(['a', 'b'])
  })
})
