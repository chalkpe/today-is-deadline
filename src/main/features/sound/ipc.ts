import type { Handlers } from '@main/shared/ipc'
import { CHANNELS } from '@shared/ipc'
import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron'
import { AUDIO_EXTENSIONS } from './content-type'
import { soundUrlFor } from './resolve'

export function soundHandlers() {
  return {
    [CHANNELS.SOUND_PICK_FILE]: async (_args, event) => {
      const options: OpenDialogOptions = { properties: ['openFile'], filters: [{ name: '오디오', extensions: AUDIO_EXTENSIONS }] }
      // 요청한 창(설정 창)에 붙여 띄운다
      const parent = BrowserWindow.fromWebContents(event.sender)
      const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options)
      return result.canceled ? null : (result.filePaths[0] ?? null)
    },
    [CHANNELS.SOUND_URL]: (sound) => soundUrlFor(sound),
  } satisfies Handlers<'sound:pickFile' | 'sound:url'>
}
