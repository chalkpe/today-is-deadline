import type { Broadcast } from '@main/shared/ipc'
import { BrowserWindow } from 'electron'

/** 열린 모든 창(숨긴 위젯 포함)의 webContents에 푸시한다. 아직 로드 중인 창은 받지 못하고, 마운트 때 invoke로 다시 읽는다. */
export const broadcast: Broadcast = (channel, payload) => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}
