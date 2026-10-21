import { extname } from 'node:path'

const AUDIO_CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
}

/** 소리 파일 선택 필터에 쓰는 확장자 */
export const AUDIO_EXTENSIONS = Object.keys(AUDIO_CONTENT_TYPES)

/** 확장자로 정한 sound:// 응답의 Content-Type. 모르면 application/octet-stream. */
export function audioContentType(path: string): string {
  return AUDIO_CONTENT_TYPES[extname(path).slice(1).toLowerCase()] ?? 'application/octet-stream'
}
