import { join } from 'node:path'
import { BUILTIN_SOUNDS, type BuiltinSoundName, type SoundSetting } from '@shared/model/settings'

const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193

/**
 * 파일 경로의 FNV-1a 32비트 해시(UTF-8 바이트)를 8자리 소문자 hex로.
 * 파일이 바뀌면 sound://file URL도 바뀌어 Chromium이 이전 파일의 미디어 데이터를 재사용하지 않는다.
 */
export function soundToken(path: string): string {
  let hash = FNV_OFFSET_BASIS
  for (const byte of new TextEncoder().encode(path)) hash = Math.imul(hash ^ byte, FNV_PRIME)
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function soundUrlFor(sound: SoundSetting): string {
  return sound.kind === 'builtin' ? `sound://builtin/${sound.name}` : `sound://file/${soundToken(sound.path)}`
}

/** sound:// URL을 실제 파일 경로로 바꾼다. 허용되지 않는 요청(현재 설정의 토큰이 아닌 file URL 포함)은 null. */
export function resolveSoundPath(url: string, sound: SoundSetting, soundsDir: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'sound:' || parsed.search !== '' || parsed.hash !== '') return null
  if (parsed.hostname === 'builtin') {
    const name = parsed.pathname.slice(1)
    if (!(BUILTIN_SOUNDS as readonly string[]).includes(name)) return null
    return join(soundsDir, `${name as BuiltinSoundName}.mp3`)
  }
  if (parsed.hostname === 'file' && /^\/[0-9a-f]{8}$/.test(parsed.pathname)) {
    return sound.kind === 'file' && parsed.pathname.slice(1) === soundToken(sound.path) ? sound.path : null
  }
  return null
}
