import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, normalizeSettings, SETTINGS_ERRORS, validateSettings } from './settings'

describe('normalizeSettings', () => {
  it('빈 객체는 기본값과 같다', () => {
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('객체가 아닌 입력은 기본값이다', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings('x')).toEqual(DEFAULT_SETTINGS)
  })

  it('잘못된 필드만 기본값으로 바꾸고 width는 최소값을 보장한다', () => {
    const s = normalizeSettings({ widget: { width: 10 }, heatmap: { mode: 'nope' } })
    expect(s.widget.width).toBe(140)
    expect(s.heatmap.mode).toBe('relative')
  })

  it('숫자가 아닌 width는 기본값이다', () => {
    expect(normalizeSettings({ widget: { width: 'wide' } }).widget.width).toBe(320)
  })

  it('형제 필드는 유지한다', () => {
    const s = normalizeSettings({ heatmap: { mode: 'fixed', baseColor: 5 }, widget: { x: 10, y: 'a' } })
    expect(s.heatmap.mode).toBe('fixed')
    expect(s.heatmap.baseColor).toBe(DEFAULT_SETTINGS.heatmap.baseColor)
    expect(s.widget.x).toBe(10)
    expect(s.widget.y).toBeNull()
  })

  it('파일 소리 설정을 보존한다', () => {
    expect(normalizeSettings({ alert: { sound: { kind: 'file', path: '/a.mp3' } } }).alert.sound).toEqual({ kind: 'file', path: '/a.mp3' })
  })

  it('잘못된 임계값은 통째로 기본값이다', () => {
    expect(normalizeSettings({ heatmap: { fixedThresholds: [1, 2, 3] } }).heatmap.fixedThresholds).toEqual([1000, 2000, 3000, 4000])
    expect(normalizeSettings({ heatmap: { fixedThresholds: [1, 2, 3, 4] } }).heatmap.fixedThresholds).toEqual([1, 2, 3, 4])
  })
})

describe('validateSettings', () => {
  it('기본값은 통과한다', () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual([])
  })

  it('규칙마다 해당 메시지를 돌려준다', () => {
    const withThresholds = (fixedThresholds: readonly number[]) => ({
      ...DEFAULT_SETTINGS,
      heatmap: { ...DEFAULT_SETTINGS.heatmap, fixedThresholds: fixedThresholds as never },
    })
    expect(validateSettings(withThresholds([1, 3, 2, 4]))).toEqual([SETTINGS_ERRORS.thresholds])
    expect(validateSettings(withThresholds([1, 2, 3]))).toEqual([SETTINGS_ERRORS.thresholds])
    expect(validateSettings({ ...DEFAULT_SETTINGS, alert: { ...DEFAULT_SETTINGS.alert, idleSeconds: 9 } })).toEqual([SETTINGS_ERRORS.idle])
    expect(validateSettings({ ...DEFAULT_SETTINGS, alert: { ...DEFAULT_SETTINGS.alert, repeatSeconds: 9 } })).toEqual([
      SETTINGS_ERRORS.repeat,
    ])
  })
})
