import { DEFAULT_SETTINGS } from '@shared/model/settings'
import { describe, expect, it } from 'vitest'
import { toggleAlert, toggleCounting, toggleLock, toggleWidget, trayIconFile, trayState } from './state'

describe('trayIconFile', () => {
  it('macOS는 템플릿 PNG, 그 밖은 ICO이고 카운트가 돌지 않으면 흐린 아이콘', () => {
    expect(trayIconFile('darwin', true)).toBe('trayTemplate.png')
    expect(trayIconFile('darwin', false)).toBe('tray-offTemplate.png')
    expect(trayIconFile('win32', true)).toBe('tray.ico')
    expect(trayIconFile('win32', false)).toBe('tray-off.ico')
  })
})

describe('trayState', () => {
  it('체크 항목은 설정 값을 그대로 보여 준다', () => {
    const s = { ...DEFAULT_SETTINGS, widget: { ...DEFAULT_SETTINGS.widget, locked: true } }
    expect(trayState(s)).toEqual({ counting: true, alert: true, widgetVisible: true, locked: true })
  })
})

describe('토글', () => {
  it.each([
    ['toggleCounting', toggleCounting, (s: typeof DEFAULT_SETTINGS) => s.counting.enabled],
    ['toggleAlert', toggleAlert, (s: typeof DEFAULT_SETTINGS) => s.alert.enabled],
    ['toggleWidget', toggleWidget, (s: typeof DEFAULT_SETTINGS) => s.widget.visible],
    ['toggleLock', toggleLock, (s: typeof DEFAULT_SETTINGS) => s.widget.locked],
  ] as const)('%s는 해당 값만 뒤집고 원본을 바꾸지 않는다', (_name, toggle, pick) => {
    const before = structuredClone(DEFAULT_SETTINGS)
    const after = toggle(DEFAULT_SETTINGS)
    expect(pick(after)).toBe(!pick(DEFAULT_SETTINGS))
    expect(toggle(after)).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS).toEqual(before)
  })
})
