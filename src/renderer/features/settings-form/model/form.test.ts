import { DEFAULT_SETTINGS, SETTINGS_ERRORS, type Settings, validateSettings } from '@shared/model/settings'
import { describe, expect, it } from 'vitest'
import { applyField, errorsByGroup, errorsFor, fileNameOf, groupOf } from './form'

const base = (): Settings => structuredClone(DEFAULT_SETTINGS)

describe('applyField', () => {
  it('원본을 바꾸지 않고 fixedThresholds.2만 갱신한다', () => {
    const s = base()
    const next = applyField(s, 'heatmap.fixedThresholds.2', 3500)
    expect(next.heatmap.fixedThresholds).toEqual([1000, 2000, 3500, 4000])
    expect(s.heatmap.fixedThresholds).toEqual([1000, 2000, 3000, 4000])
    expect(next.heatmap.fixedThresholds).not.toBe(s.heatmap.fixedThresholds)
    expect(next.heatmap).not.toBe(s.heatmap)
    expect(next).not.toBe(s)
  })

  it('바뀌지 않은 묶음은 그대로 공유한다', () => {
    const s = base()
    const next = applyField(s, 'heatmap.baseColor', '#ff0000')
    expect(next.heatmap.baseColor).toBe('#ff0000')
    expect(s.heatmap.baseColor).toBe('#39d353')
    expect(next.alert).toBe(s.alert)
    expect(next.widget).toBe(s.widget)
  })

  it('임계값·초 입력은 문자열을 숫자로 바꾼다', () => {
    const s = base()
    expect(applyField(s, 'heatmap.fixedThresholds.0', '500').heatmap.fixedThresholds).toEqual([500, 2000, 3000, 4000])
    expect(applyField(s, 'alert.idleSeconds', '30').alert.idleSeconds).toBe(30)
    expect(applyField(s, 'alert.repeatSeconds', 45).alert.repeatSeconds).toBe(45)
  })

  it('숫자가 아닌 값(NaN)이면 이전 값을 유지한다', () => {
    const s = base()
    expect(applyField(s, 'heatmap.fixedThresholds.1', 'abc')).toBe(s)
    expect(applyField(s, 'alert.idleSeconds', 'abc')).toBe(s)
  })

  it('모드·토글·소리·자동 시작을 갱신한다', () => {
    const s = base()
    expect(applyField(s, 'heatmap.mode', 'fixed').heatmap.mode).toBe('fixed')
    expect(applyField(s, 'heatmap.showDayLabels', true).heatmap.showDayLabels).toBe(true)
    expect(applyField(s, 'alert.enabled', false).alert.enabled).toBe(false)
    expect(applyField(s, 'alert.sound', { kind: 'file', path: '/a/b.mp3' }).alert.sound).toEqual({ kind: 'file', path: '/a/b.mp3' })
    expect(applyField(s, 'general.openAtLogin', true).general.openAtLogin).toBe(true)
    expect(s).toEqual(DEFAULT_SETTINGS)
  })
})

describe('errorsFor', () => {
  it('기본 설정은 오류가 없다', () => {
    expect(errorsFor(base())).toEqual([])
  })

  it('validateSettings에 맡긴다(역순 임계값·짧은 대기 시간)', () => {
    const s = applyField(applyField(base(), 'heatmap.fixedThresholds.0', 5000), 'alert.idleSeconds', 5)
    expect(errorsFor(s)).toEqual(validateSettings(s))
    expect(errorsFor(s)).toEqual([SETTINGS_ERRORS.thresholds, SETTINGS_ERRORS.idle])
  })
})

describe('fileNameOf', () => {
  it('경로의 마지막 부분을 돌려준다(/ 와 \\ 모두)', () => {
    expect(fileNameOf('/Users/me/Music/bell.mp3')).toBe('bell.mp3')
    expect(fileNameOf('C:\\Users\\me\\bell.wav')).toBe('bell.wav')
  })
})

describe('groupOf', () => {
  it('경로의 첫 마디가 묶음이다', () => {
    expect(groupOf('heatmap.fixedThresholds.3')).toBe('heatmap')
    expect(groupOf('alert.sound')).toBe('alert')
    expect(groupOf('general.openAtLogin')).toBe('general')
  })
})

describe('errorsByGroup', () => {
  it('알려진 오류는 그 필드의 묶음으로, 모르는 오류는 바꾼 필드의 묶음으로 나눈다', () => {
    const { thresholds, idle, soundFile } = SETTINGS_ERRORS
    expect(errorsByGroup([soundFile], 'heatmap')).toEqual({ alert: [soundFile] })
    expect(errorsByGroup([thresholds, idle, '알 수 없음'], 'general')).toEqual({
      heatmap: [thresholds],
      alert: [idle],
      general: ['알 수 없음'],
    })
  })
})
