import type { Broadcast } from '@main/shared/ipc'
import { PUSH } from '@shared/ipc'
import type { Settings } from '@shared/model/settings'
import { app, nativeTheme } from 'electron'
import { createAppearanceApplier } from './appearance'

const sharedApplier = createAppearanceApplier({
  setThemeSource: (source) => {
    nativeTheme.themeSource = source
  },
})

/** 시작 시 저장된 외관 설정을 nativeTheme에 반영한다. 창을 만들기 전에 호출한다. */
export function applyInitialAppearance(store: { get(): Settings }): void {
  sharedApplier.apply(store.get())
}

/** 설정이 바뀌면 모든 창에 알리고, 로그인 시 자동 시작을 OS에 반영한다. */
export function publishSettings(
  store: { onChange(listener: (next: Settings, prev: Settings) => void): () => void },
  send: Broadcast,
): void {
  // 첫 페인트 전에 외관을 반영해야 하므로 창을 만들기 전에 호출되는 applyInitialAppearance와 같은 적용기를 공유한다.
  const appearance = sharedApplier
  store.onChange((next, prev) => {
    appearance.apply(next)
    send(PUSH.SETTINGS, next)
    if (next.general.openAtLogin !== prev.general.openAtLogin) app.setLoginItemSettings({ openAtLogin: next.general.openAtLogin })
  })
}
