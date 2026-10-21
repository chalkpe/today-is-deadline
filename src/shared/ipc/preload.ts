import type { IEvents } from './events'
import type { IPush } from './push'

export type ElectronApi = {
  invoke<K extends keyof IEvents>(
    channel: K,
    ...args: IEvents[K]['args'] extends void ? [] : [IEvents[K]['args']]
  ): Promise<IEvents[K]['response']>
  on<K extends keyof IPush>(channel: K, listener: (payload: IPush[K]) => void): () => void
}

type IpcRendererLike = {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  on(channel: string, l: (e: unknown, payload: unknown) => void): void
  removeListener(channel: string, l: (...a: unknown[]) => void): void
}

export function createElectronApi(ipc: IpcRendererLike): ElectronApi {
  return {
    invoke: ((channel: string, ...args: unknown[]) => ipc.invoke(channel, ...args)) as ElectronApi['invoke'],
    on(channel, listener) {
      // Electron은 (event, payload)로 호출하므로 payload만 넘기는 래퍼를 쓰고, 해제 시 같은 참조를 제거한다
      const wrapper = (_event: unknown, payload: unknown) => (listener as (p: unknown) => void)(payload)
      ipc.on(channel, wrapper)
      return () => ipc.removeListener(channel, wrapper as (...a: unknown[]) => void)
    },
  }
}

declare global {
  interface Window {
    electron: ElectronApi
  }
}
