import type { ElectronApi } from '@shared/ipc/preload'
import type { IPush } from '@shared/ipc/push'
import { useEffect, useRef } from 'react'

/** preload가 노출한 API. window는 부를 때 읽으므로 이 모듈을 import하는 순수 함수도 node 테스트에서 불러올 수 있다. */
export const api: ElectronApi = {
  invoke: (channel, ...args) => window.electron.invoke(channel, ...args),
  on: (channel, listener) => window.electron.on(channel, listener),
}

/** 푸시 채널을 구독한다. 최신 listener를 ref로 들고 있어 인라인 함수를 넘겨도 재구독하지 않는다. */
export function usePush<K extends keyof IPush>(channel: K, listener: (payload: IPush[K]) => void): void {
  const ref = useRef(listener)
  ref.current = listener
  useEffect(() => api.on(channel, (payload) => ref.current(payload)), [channel])
}
