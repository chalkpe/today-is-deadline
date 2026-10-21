import { describe, expect, it } from 'vitest'
import { coerceSettings, DEFAULT_SETTINGS, normalizeSettings, SETTINGS_ERRORS, validateSettings } from './settings'

const withAlert = (alert: Partial<(typeof DEFAULT_SETTINGS)['alert']>) => ({
  ...DEFAULT_SETTINGS,
  alert: { ...DEFAULT_SETTINGS.alert, ...alert },
})

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

  it.each([[[1, 3, 2, 4]], [[1, 1, 2, 3]], [[4000, 3000, 2000, 1000]], [[0, 1, 2, 3]], [[1, 2, 3, 3.5]]])(
    '엄격한 오름차순 양의 정수가 아닌 임계값 %j는 기본값으로 고친다',
    (fixedThresholds) => {
      expect(normalizeSettings({ heatmap: { fixedThresholds } }).heatmap.fixedThresholds).toEqual([1000, 2000, 3000, 4000])
    },
  )

  it.each([[9], [0], [-60], [86401], [1e12], [10.5], [Number.NaN], [Number.POSITIVE_INFINITY], ['30'], [null]])(
    '범위(10~86400 정수)를 벗어난 대기 시간·반복 간격 %j는 기본값으로 고친다',
    (value) => {
      const { alert } = normalizeSettings({ alert: { idleSeconds: value, repeatSeconds: value } })
      expect(alert.idleSeconds).toBe(DEFAULT_SETTINGS.alert.idleSeconds)
      expect(alert.repeatSeconds).toBe(DEFAULT_SETTINGS.alert.repeatSeconds)
    },
  )

  it('경계값 10·86400은 그대로 둔다', () => {
    const { alert } = normalizeSettings({ alert: { idleSeconds: 10, repeatSeconds: 86400 } })
    expect(alert.idleSeconds).toBe(10)
    expect(alert.repeatSeconds).toBe(86400)
  })

  it.each([
    [{ alert: { idleSeconds: 0.001, repeatSeconds: -1 }, heatmap: { fixedThresholds: [9, 8, 7, 6] } }],
    [{ alert: { idleSeconds: 1e9, repeatSeconds: 5 }, heatmap: { fixedThresholds: [1, 1, 1, 1] } }],
    [{ alert: 'x', heatmap: null }],
  ])('손으로 고친 파일 %j도 정규화하면 검증을 통과한다', (input) => {
    expect(validateSettings(normalizeSettings(input))).toEqual([])
  })
})

describe('coerceSettings', () => {
  it('모양만 맞추고 범위를 벗어난 값은 남겨 validateSettings가 거부하게 한다', () => {
    const s = coerceSettings({ alert: { idleSeconds: 5, repeatSeconds: 100000 }, heatmap: { fixedThresholds: [1, 3, 2, 4] } })
    expect(s.alert.idleSeconds).toBe(5)
    expect(s.alert.repeatSeconds).toBe(100000)
    expect(s.heatmap.fixedThresholds).toEqual([1, 3, 2, 4])
    expect(validateSettings(s)).toEqual([SETTINGS_ERRORS.thresholds, SETTINGS_ERRORS.idle, SETTINGS_ERRORS.repeatMax])
  })

  it('타입이 틀린 필드는 기본값이다', () => {
    expect(coerceSettings({ alert: { idleSeconds: '30' }, heatmap: { fixedThresholds: 'x' } })).toEqual(DEFAULT_SETTINGS)
    expect(coerceSettings(null)).toEqual(DEFAULT_SETTINGS)
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

  it('대기 시간·반복 간격은 86400초(하루) 이하', () => {
    expect(validateSettings(withAlert({ idleSeconds: 86400, repeatSeconds: 86400 }))).toEqual([])
    expect(validateSettings(withAlert({ idleSeconds: 86401 }))).toEqual([SETTINGS_ERRORS.idleMax])
    expect(validateSettings(withAlert({ repeatSeconds: 1e9 }))).toEqual([SETTINGS_ERRORS.repeatMax])
    expect(SETTINGS_ERRORS.idleMax).toBe('대기 시간은 86400초 이하여야 합니다')
    expect(SETTINGS_ERRORS.repeatMax).toBe('반복 간격은 86400초 이하여야 합니다')
  })

  it('대기 시간·반복 간격은 정수 초(소수·NaN은 최소 규칙 오류)', () => {
    expect(validateSettings(withAlert({ idleSeconds: 10.5 }))).toEqual([SETTINGS_ERRORS.idle])
    expect(validateSettings(withAlert({ repeatSeconds: Number.NaN }))).toEqual([SETTINGS_ERRORS.repeat])
  })
})
