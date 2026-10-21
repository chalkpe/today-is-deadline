import { WIDGET_MIN_WIDTH } from '@shared/model/settings'
import type { Rect } from './bounds'

export type Size = { width: number; height: number }

export const MIN_WIDGET_HEIGHT = 32

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max))

/**
 * widget:resize 요청을 실제 창 크기로 바꾼다. 바뀔 것이 없거나 요청이 잘못되면 null.
 * 잠금 중에는 사용자 리사이즈인 너비 변경을 무시하고, 내용(하루 내역 펼침)에 따른 높이 변경만 따른다.
 */
export function resizeTarget(current: Size, request: unknown, locked: boolean, max: Size): Size | null {
  if (typeof request !== 'object' || request === null) return null
  const { width, height } = request as Record<string, unknown>
  const next = { ...current }
  if (!locked && isFiniteNumber(width)) next.width = clamp(Math.round(width), WIDGET_MIN_WIDTH, max.width)
  if (isFiniteNumber(height)) next.height = clamp(Math.round(height), MIN_WIDGET_HEIGHT, max.height)
  return next.width === current.width && next.height === current.height ? null : next
}

/**
 * 높이를 newHeight로 바꿀 때 창의 아래 끝이 작업 영역 아래 끝을 넘으면 넘는 만큼 위로 올린다(화면 아래쪽 위젯의 내역 펼침).
 * x는 그대로 두고, 작업 영역 위 끝보다 위로는 올리지 않는다.
 */
export function placeResized(bounds: Rect, newHeight: number, workArea: Rect): { x: number; y: number; height: number } {
  const overflow = bounds.y + newHeight - (workArea.y + workArea.height)
  const y = overflow > 0 ? Math.max(workArea.y, bounds.y - overflow) : bounds.y
  return { x: bounds.x, y, height: newHeight }
}
