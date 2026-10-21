import { WIDGET_MIN_WIDTH } from '@shared/model/settings'
import { describe, expect, it } from 'vitest'
import { MIN_WIDGET_HEIGHT, placeResized, resizeTarget } from './resize'

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

describe('placeResized', () => {
  const workArea = { x: 0, y: 25, width: 1440, height: 875 } // 아래 끝 900
  const at = (y: number, height = 138) => ({ x: 1000, y, width: 320, height })

  it('늘어나도 작업 영역 아래 끝을 넘지 않으면 위치를 그대로 둔다', () => {
    expect(placeResized(at(100), 300, workArea)).toEqual({ x: 1000, y: 100, height: 300 })
    expect(placeResized(at(600), 300, workArea)).toEqual({ x: 1000, y: 600, height: 300 }) // 600 + 300 = 900, 딱 맞음
  })

  it('아래 끝을 넘는 만큼 창을 위로 올린다(x는 그대로)', () => {
    expect(placeResized(at(650), 300, workArea)).toEqual({ x: 1000, y: 600, height: 300 })
    expect(placeResized(at(750), 200, workArea)).toEqual({ x: 1000, y: 700, height: 200 })
  })

  it('올릴 자리가 모자라면 작업 영역 위 끝에서 멈춘다', () => {
    expect(placeResized(at(700), 875, workArea)).toEqual({ x: 1000, y: 25, height: 875 })
    expect(placeResized(at(60), 900, workArea)).toEqual({ x: 1000, y: 25, height: 900 })
  })

  it('줄어들 때는 움직이지 않는다', () => {
    expect(placeResized(at(700, 200), 138, workArea)).toEqual({ x: 1000, y: 700, height: 138 })
  })

  it('보조 디스플레이(음수 좌표)에서도 그 작업 영역 기준으로 올린다', () => {
    const left = { x: -1920, y: -200, width: 1920, height: 1080 } // 아래 끝 880
    expect(placeResized({ x: -500, y: 800, width: 320, height: 138 }, 226, left)).toEqual({ x: -500, y: 654, height: 226 })
  })
})
