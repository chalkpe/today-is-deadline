import { pathToFileURL } from 'node:url'
import type { SoundSetting } from '@shared/model/settings'
import { net, protocol } from 'electron'
import { resolveSoundPath } from './resolve'

/** app.whenReady() 전에 불러야 한다. standard 스킴이라 Chromium이 URL을 정규화하지만 resolveSoundPath가 이름을 허용 목록으로 거른다. */
export function registerSoundScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'sound', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ])
}

/** sound://builtin/<이름>은 내장 파일, sound://file은 설정에 저장된 파일만 응답한다. 그 밖에는 404. */
export function serveSounds({ soundsDir, getSound }: { soundsDir: string; getSound: () => SoundSetting }): void {
  protocol.handle('sound', async (request) => {
    const path = resolveSoundPath(request.url, getSound(), soundsDir)
    if (path === null) return new Response(null, { status: 404 })
    try {
      return await net.fetch(pathToFileURL(path).href)
    } catch {
      // 설정된 파일이 지워졌거나 읽을 수 없는 경우
      return new Response(null, { status: 404 })
    }
  })
}
