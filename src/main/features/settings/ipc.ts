import type { Handlers } from '@main/shared/ipc'
import { CHANNELS } from '@shared/ipc'
import { normalizeSettings } from '@shared/model/settings'
import type { SettingsStore } from './store'

export function settingsHandlers(store: Pick<SettingsStore, 'get' | 'set'>) {
  return {
    [CHANNELS.SETTINGS_GET]: () => store.get(),
    // 깨진 입력이 검증 단계에서 TypeError를 내지 않도록 먼저 정규화하고, 기본값 객체를 공유하지 않게 복제한다
    [CHANNELS.SETTINGS_SET]: (input) => store.set(structuredClone(normalizeSettings(input))),
  } satisfies Handlers<'settings:get' | 'settings:set'>
}
