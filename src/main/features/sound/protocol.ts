import { pathToFileURL } from 'node:url'
import type { SoundSetting } from '@shared/model/settings'
import { net, protocol } from 'electron'
import { audioContentType } from './content-type'
import { resolveSoundPath } from './resolve'

/** app.whenReady() 전에 불러야 한다. standard 스킴이라 Chromium이 URL을 정규화하지만 resolveSoundPath가 이름·토큰을 허용 목록으로 거른다. */
export function registerSoundScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'sound', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ])
}

const notFound = () => new Response(null, { status: 404 })

/**
 * sound://builtin/<이름>은 내장 파일, sound://file/<토큰>은 설정에 저장된 파일(토큰이 맞을 때)만 응답한다. 그 밖에는 404.
 * 파일이 바뀌면 토큰(URL)이 바뀌므로 캐시 헤더로 재사용을 막을 필요가 없다(no-store는 길이를 Infinity로 만든다).
 */
export function serveSounds({ soundsDir, getSound }: { soundsDir: string; getSound: () => SoundSetting }): void {
  protocol.handle('sound', async (request) => {
    const path = resolveSoundPath(request.url, getSound(), soundsDir)
    if (path === null) return notFound()
    try {
      const file = await net.fetch(pathToFileURL(path).href)
      if (!file.ok) return notFound()
      // 새 Response로 감싸면 본문 길이를 잃어 <audio>의 길이가 Infinity가 되므로 받은 응답의 헤더만 고쳐 그대로 돌려준다
      file.headers.set('content-type', audioContentType(path))
      return file
    } catch {
      // 설정된 파일이 지워졌거나 읽을 수 없는 경우
      return notFound()
    }
  })
}
