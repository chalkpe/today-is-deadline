import { WIDGET_MIN_WIDTH } from '@shared/model/settings'
import { describe, expect, it } from 'vitest'
import { MIN_WIDGET_HEIGHT, resizeTarget } from './resize'

const current = { width: 320, height: 138 }
const max = { width: 1440, height: 875 }

describe('resizeTarget', () => {
  it('너비·높이를 정수로 반올림해 적용한다', () => {
    expect(resizeTarget(current, { width: 400.6, height: 250.2 }, false, max)).toEqual({ width: 401, height: 250 })
    expect(resizeTarget(current, { height: 300 }, false, max)).toEqual({ width: 320, height: 300 })
  })

  it('너비는 최소 너비와 작업 영역 사이, 높이는 최소 높이와 작업 영역 사이로 자른다', () => {
    expect(resizeTarget(current, { width: 10, height: 5 }, false, max)).toEqual({ width: WIDGET_MIN_WIDTH, height: MIN_WIDGET_HEIGHT })
    expect(resizeTarget(current, { width: 5000, height: 5000 }, false, max)).toEqual({ width: 1440, height: 875 })
  })

  it('잠금 중에는 너비 변경(사용자 리사이즈)을 무시하고 높이(내역 펼침)만 따른다', () => {
    expect(resizeTarget(current, { width: 500 }, true, max)).toBeNull()
    expect(resizeTarget(current, { width: 500, height: 300 }, true, max)).toEqual({ width: 320, height: 300 })
  })

  it('바뀌는 것이 없으면 null', () => {
    expect(resizeTarget(current, { width: 320, height: 138 }, false, max)).toBeNull()
    expect(resizeTarget(current, {}, false, max)).toBeNull()
  })

  it.each([[null], ['320'], [{ width: '400' }], [{ width: Number.NaN, height: Number.POSITIVE_INFINITY }]])(
    '잘못된 요청 %j는 무시한다',
    (request) => {
      expect(resizeTarget(current, request, false, max)).toBeNull()
    },
  )
})
