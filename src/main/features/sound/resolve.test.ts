import { join } from 'node:path'
import type { SoundSetting } from '@shared/model/settings'
import { describe, expect, it } from 'vitest'
import { resolveSoundPath, soundToken, soundUrlFor } from './resolve'

const builtin: SoundSetting = { kind: 'builtin', name: 'rooster' }
const file: SoundSetting = { kind: 'file', path: '/tmp/my.mp3' }
const fileUrl = `sound://file/${soundToken('/tmp/my.mp3')}`

describe('soundToken', () => {
  it('FNV-1a 32비트 해시를 8자리 소문자 hex로', () => {
    // FNV-1a 32 공개 시험값
    expect(soundToken('')).toBe('811c9dc5')
    expect(soundToken('a')).toBe('e40c292c')
    expect(soundToken('foobar')).toBe('bf9cf968')
  })

  it('UTF-8 바이트로 해시하고, 경로가 다르면 토큰도 다르다', () => {
    const korean = soundToken('/Users/나/소리/닭.mp3')
    expect(korean).toMatch(/^[0-9a-f]{8}$/)
    expect(korean).toBe(soundToken('/Users/나/소리/닭.mp3'))
    expect(soundToken('/a/rooster.mp3')).not.toBe(soundToken('/a/dog-barking.mp3'))
  })
})

describe('soundUrlFor', () => {
  it('builtin은 이름, file은 경로 토큰을 담는다', () => {
    expect(soundUrlFor(builtin)).toBe('sound://builtin/rooster')
    expect(soundUrlFor(file)).toBe(fileUrl)
    expect(fileUrl).toMatch(/^sound:\/\/file\/[0-9a-f]{8}$/)
  })
})

describe('resolveSoundPath', () => {
  it('builtin 이름을 mp3 경로로', () => {
    expect(resolveSoundPath('sound://builtin/rooster', builtin, '/s')).toBe(join('/s', 'rooster.mp3'))
  })
  it('file 설정이고 토큰이 맞으면 그 경로', () => {
    expect(resolveSoundPath(soundUrlFor(file), file, '/s')).toBe('/tmp/my.mp3')
  })
  it('토큰이 없는 예전 sound://file은 null', () => {
    expect(resolveSoundPath('sound://file', file, '/s')).toBeNull()
    expect(resolveSoundPath('sound://file/', file, '/s')).toBeNull()
  })
  it('다른 파일의 토큰(설정이 바뀌기 전 URL)은 null', () => {
    expect(resolveSoundPath(`sound://file/${soundToken('/tmp/old.mp3')}`, file, '/s')).toBeNull()
  })
  it('토큰 형식이 아니거나 조각이 둘 이상이면 null', () => {
    expect(resolveSoundPath(`${fileUrl}/x`, file, '/s')).toBeNull()
    expect(resolveSoundPath(fileUrl.toUpperCase().replace('SOUND://FILE', 'sound://file'), file, '/s')).toBeNull()
    expect(resolveSoundPath('sound://file/1234567', file, '/s')).toBeNull()
    expect(resolveSoundPath('sound://file/../tmp/my.mp3', file, '/s')).toBeNull()
  })
  it('쿼리·해시가 붙으면 null', () => {
    expect(resolveSoundPath(`${fileUrl}?x=1`, file, '/s')).toBeNull()
    expect(resolveSoundPath(`${fileUrl}#x`, file, '/s')).toBeNull()
  })
  it('builtin 설정에서 file URL은 null', () => {
    expect(resolveSoundPath(fileUrl, builtin, '/s')).toBeNull()
  })
  it('알 수 없는 이름은 null', () => {
    expect(resolveSoundPath('sound://builtin/evil', builtin, '/s')).toBeNull()
  })
  it('경로 탈출·쿼리·알 수 없는 호스트는 null', () => {
    expect(resolveSoundPath('sound://builtin/../x', builtin, '/s')).toBeNull()
    expect(resolveSoundPath('sound://builtin/rooster?x=1', builtin, '/s')).toBeNull()
    expect(resolveSoundPath('sound://other/rooster', builtin, '/s')).toBeNull()
    expect(resolveSoundPath('not a url', builtin, '/s')).toBeNull()
  })
})
