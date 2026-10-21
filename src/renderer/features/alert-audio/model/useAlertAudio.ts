import { usePush } from '@renderer/shared/lib/ipc'
import type { IPush } from '@shared/ipc/push'
import type { RefObject } from 'react'

type AudioLike = Pick<HTMLAudioElement, 'play' | 'pause' | 'src' | 'currentTime'>

/**
 * push:alert를 <audio> 조작으로 옮긴다. 상태는 audio 요소에만 있다.
 * 재생 중에 다시 play가 오면(반복 간격 < 소리 길이) 겹치지 않게 처음부터 다시 튼다.
 */
export function createAlertController(audio: AudioLike): { handle(payload: IPush['push:alert']): void } {
  return {
    handle(payload) {
      if (payload.action === 'stop') {
        audio.pause()
        return
      }
      // 파일이 바뀌면 URL(토큰)도 바뀌므로 같은 URL이면 이미 불러온 소리를 다시 쓴다
      if (audio.src !== payload.url) audio.src = payload.url
      audio.currentTime = 0
      // 재생 실패(파일 없음 등)는 다음 알림에서 다시 시도하면 되므로 무시한다
      audio.play().catch(() => {})
    },
  }
}

/** 위젯 창에 상주하는 <audio>로 알림음을 재생한다. */
export function useAlertAudio(ref: RefObject<HTMLAudioElement | null>): void {
  usePush('push:alert', (payload) => {
    if (ref.current) createAlertController(ref.current).handle(payload)
  })
}
