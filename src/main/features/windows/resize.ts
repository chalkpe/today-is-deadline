import { WIDGET_MIN_WIDTH } from '@shared/model/settings'

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
