import type { IPush } from '@shared/ipc/push'
import { useEffect, useRef } from 'react'

export const api = window.electron

/** 푸시 채널을 구독한다. 최신 listener를 ref로 들고 있어 인라인 함수를 넘겨도 재구독하지 않는다. */
export function usePush<K extends keyof IPush>(channel: K, listener: (payload: IPush[K]) => void): void {
  const ref = useRef(listener)
  ref.current = listener
  useEffect(() => api.on(channel, (payload) => ref.current(payload)), [channel])
}
