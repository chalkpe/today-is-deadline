import type { Broadcast } from '@main/shared/ipc'
import { PUSH } from '@shared/ipc'
import type { Settings } from '@shared/model/settings'
import { app } from 'electron'

/** 설정이 바뀌면 모든 창에 알리고(카운트 On/Off는 따로 한 번 더), 로그인 시 자동 시작을 OS에 반영한다. */
export function publishSettings(
  store: { onChange(listener: (next: Settings, prev: Settings) => void): () => void },
  send: Broadcast,
): void {
  store.onChange((next, prev) => {
    send(PUSH.SETTINGS, next)
    if (next.counting.enabled !== prev.counting.enabled) send(PUSH.COUNTING, next.counting.enabled)
    if (next.general.openAtLogin !== prev.general.openAtLogin) app.setLoginItemSettings({ openAtLogin: next.general.openAtLogin })
  })
}
