import type { Handlers } from '@main/shared/ipc'
import { CHANNELS } from '@shared/ipc'
import { coerceSettings } from '@shared/model/settings'
import type { SettingsStore } from './store'

export function settingsHandlers(store: Pick<SettingsStore, 'get' | 'set'>) {
  return {
    [CHANNELS.SETTINGS_GET]: () => store.get(),
    // 깨진 입력이 검증 단계에서 TypeError를 내지 않도록 모양을 먼저 맞추고, 기본값 객체를 공유하지 않게 복제한다.
    // 범위를 벗어난 값은 고치지 않고 넘겨 저장소의 검증이 거부하게 한다.
    [CHANNELS.SETTINGS_SET]: (input) => store.set(structuredClone(coerceSettings(input))),
  } satisfies Handlers<'settings:get' | 'settings:set'>
}
