import { pathToFileURL } from 'node:url'
import type { SoundSetting } from '@shared/model/settings'
import { net, protocol } from 'electron'
import { audioContentType } from './content-type'
import { resolveSoundPath } from './resolve'

/** app.whenReady() 전에 불러야 한다. standard 스킴이라 Chromium이 URL을 정규화하지만 resolveSoundPath가 이름을 허용 목록으로 거른다. */
export function registerSoundScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'sound', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ])
}

// sound://file은 같은 URL이 설정에 따라 다른 파일을 가리키므로 renderer가 이전 응답을 재사용하지 못하게 한다
const NO_STORE = 'no-store'

const notFound = () => new Response(null, { status: 404, headers: { 'cache-control': NO_STORE } })

/** sound://builtin/<이름>은 내장 파일, sound://file은 설정에 저장된 파일만 응답한다. 그 밖에는 404. */
export function serveSounds({ soundsDir, getSound }: { soundsDir: string; getSound: () => SoundSetting }): void {
  protocol.handle('sound', async (request) => {
    const path = resolveSoundPath(request.url, getSound(), soundsDir)
    if (path === null) return notFound()
    try {
      const file = await net.fetch(pathToFileURL(path).href)
      if (!file.ok) return notFound()
      const headers = new Headers(file.headers)
      headers.set('content-type', audioContentType(path))
      headers.set('cache-control', NO_STORE)
      return new Response(file.body, { status: file.status, headers })
    } catch {
      // 설정된 파일이 지워졌거나 읽을 수 없는 경우
      return notFound()
    }
  })
}
