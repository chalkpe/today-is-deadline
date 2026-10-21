import type { Handlers } from '@main/shared/ipc'
import { CHANNELS, type PermissionStatus } from '@shared/ipc'
import { shell } from 'electron'

/** macOS 시스템 설정 > 개인정보 보호 및 보안 > 입력 모니터링 */
export const INPUT_MONITORING_URL = 'x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent'

type Deps = { status: () => PermissionStatus; requestPermission: () => void }

export function countingHandlers({ status, requestPermission }: Deps) {
  return {
    [CHANNELS.PERMISSION_STATUS]: () => status(),
    // 허용 여부는 세션의 2초 재확인이 알아챈다
    [CHANNELS.PERMISSION_REQUEST]: () => {
      requestPermission()
    },
    [CHANNELS.PERMISSION_OPEN_SETTINGS]: async () => {
      if (process.platform === 'darwin') await shell.openExternal(INPUT_MONITORING_URL)
    },
  } satisfies Handlers<'permission:status' | 'permission:request' | 'permission:openSettings'>
}
