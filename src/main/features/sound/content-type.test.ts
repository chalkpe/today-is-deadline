import { describe, expect, it } from 'vitest'
import { AUDIO_EXTENSIONS, audioContentType } from './content-type'

describe('audioContentType', () => {
  it.each([
    ['/Users/a/rooster.mp3', 'audio/mpeg'],
    ['/Users/a/ALARM.MP3', 'audio/mpeg'],
    ['/a/b.wav', 'audio/wav'],
    ['/a/b.m4a', 'audio/mp4'],
    ['/a/b.aac', 'audio/aac'],
    ['/a/b.ogg', 'audio/ogg'],
    ['C:\\Users\\a\\b.FLAC', 'audio/flac'],
  ])('%s → %s', (path, type) => {
    expect(audioContentType(path)).toBe(type)
  })

  it('모르는 확장자나 확장자가 없으면 application/octet-stream', () => {
    expect(audioContentType('/a/b.txt')).toBe('application/octet-stream')
    expect(audioContentType('/a/noext')).toBe('application/octet-stream')
  })

  it('파일 선택 필터의 확장자는 모두 Content-Type을 안다', () => {
    expect(AUDIO_EXTENSIONS).toEqual(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'])
    for (const ext of AUDIO_EXTENSIONS) expect(audioContentType(`/a/b.${ext}`)).toMatch(/^audio\//)
  })
})
