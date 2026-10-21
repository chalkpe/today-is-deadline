import { join } from 'node:path'
import { BUILTIN_SOUNDS, type BuiltinSoundName, type SoundSetting } from '@shared/model/settings'

export function soundUrlFor(sound: SoundSetting): string {
  return sound.kind === 'builtin' ? `sound://builtin/${sound.name}` : 'sound://file'
}

/** sound:// URL을 실제 파일 경로로 바꾼다. 허용되지 않는 요청은 null. */
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
  if (parsed.hostname === 'file' && (parsed.pathname === '' || parsed.pathname === '/')) {
    return sound.kind === 'file' ? sound.path : null
  }
  return null
}
