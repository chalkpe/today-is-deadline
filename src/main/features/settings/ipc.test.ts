import { DEFAULT_SETTINGS, type Settings } from '@shared/model/settings'
import { describe, expect, it, vi } from 'vitest'
import { settingsHandlers } from './ipc'

const makeStore = () => ({ get: vi.fn(() => DEFAULT_SETTINGS), set: vi.fn((_next: Settings): string[] => []) })

describe('settingsHandlers', () => {
  it('settings:get은 저장소 값을 돌려준다', () => {
    const store = makeStore()
    expect(settingsHandlers(store)['settings:get']()).toBe(DEFAULT_SETTINGS)
  })

  it('settings:set은 정규화한 값을 저장소에 넘기고 그 오류 목록을 돌려준다', () => {
    const store = makeStore()
    store.set.mockReturnValueOnce(['오류'])
    const input = { ...DEFAULT_SETTINGS, alert: { ...DEFAULT_SETTINGS.alert, idleSeconds: 5 } }
    expect(settingsHandlers(store)['settings:set'](input)).toEqual(['오류'])
    expect(store.set).toHaveBeenCalledWith(input)
  })

  it('settings:set은 범위를 벗어난 값을 고치지 않고 넘겨 저장소가 거부하게 한다', () => {
    const store = makeStore()
    const input = {
      ...DEFAULT_SETTINGS,
      heatmap: { ...DEFAULT_SETTINGS.heatmap, fixedThresholds: [1, 3, 2, 4] },
      alert: { ...DEFAULT_SETTINGS.alert, idleSeconds: 86401, repeatSeconds: 10.5 },
    }
    settingsHandlers(store)['settings:set'](input as never)
    expect(store.set).toHaveBeenCalledWith(input)
  })

  it.each([[null], ['문자열'], [{ alert: '깨짐', heatmap: { fixedThresholds: 'x' } }]])(
    '깨진 입력 %j도 던지지 않고 기본값으로 채워 넘긴다',
    (input) => {
      const store = makeStore()
      expect(() => settingsHandlers(store)['settings:set'](input as never)).not.toThrow()
      const passed = store.set.mock.calls[0][0]
      expect(passed).toEqual(DEFAULT_SETTINGS)
      // 기본값 객체를 공유하지 않는다
      expect(passed.heatmap.fixedThresholds).not.toBe(DEFAULT_SETTINGS.heatmap.fixedThresholds)
      expect(passed.alert.sound).not.toBe(DEFAULT_SETTINGS.alert.sound)
    },
  )
})
