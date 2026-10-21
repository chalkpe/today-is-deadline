import type { SoundSetting } from '@shared/model/settings'
import { describe, expect, it } from 'vitest'
import { resolveSoundPath, soundUrlFor } from './resolve'

const builtin: SoundSetting = { kind: 'builtin', name: 'rooster' }
const file: SoundSetting = { kind: 'file', path: '/tmp/my.mp3' }

describe('soundUrlFor', () => {
  it('builtin/file URL', () => {
    expect(soundUrlFor(builtin)).toBe('sound://builtin/rooster')
    expect(soundUrlFor(file)).toBe('sound://file')
  })
})

describe('resolveSoundPath', () => {
  it('builtin 이름을 mp3 경로로', () => {
    expect(resolveSoundPath('sound://builtin/rooster', builtin, '/s')).toBe('/s/rooster.mp3')
  })
  it('file 설정이면 그 경로', () => {
    expect(resolveSoundPath('sound://file', file, '/s')).toBe('/tmp/my.mp3')
  })
  it('알 수 없는 이름은 null', () => {
    expect(resolveSoundPath('sound://builtin/evil', builtin, '/s')).toBeNull()
  })
  it('builtin 설정에서 sound://file은 null', () => {
    expect(resolveSoundPath('sound://file', builtin, '/s')).toBeNull()
  })
  it('경로 탈출·쿼리·알 수 없는 호스트는 null', () => {
    expect(resolveSoundPath('sound://builtin/../x', builtin, '/s')).toBeNull()
    expect(resolveSoundPath('sound://builtin/rooster?x=1', builtin, '/s')).toBeNull()
    expect(resolveSoundPath('sound://other/rooster', builtin, '/s')).toBeNull()
    expect(resolveSoundPath('not a url', builtin, '/s')).toBeNull()
  })
})
