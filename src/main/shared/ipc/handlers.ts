import type { IEvents, IPush } from '@shared/ipc'
import type { IpcMainInvokeEvent } from 'electron'

/** 채널 K의 핸들러. 인자·반환 타입을 IEvents 계약으로 고정한다. */
export type Handler<K extends keyof IEvents> = (
  args: IEvents[K]['args'],
  event: IpcMainInvokeEvent,
) => IEvents[K]['response'] | Promise<IEvents[K]['response']>

/** 채널 → 핸들러 맵. 기본값(모든 채널)으로 쓰면 빠진 채널이 컴파일 오류가 된다. */
export type Handlers<K extends keyof IEvents = keyof IEvents> = { [P in K]: Handler<P> }

type IpcMainLike = { handle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown): void }

export function registerHandlers(ipc: IpcMainLike, handlers: Handlers): void {
  for (const channel of Object.keys(handlers) as (keyof IEvents)[]) {
    const handler = handlers[channel] as (args: unknown, event: IpcMainInvokeEvent) => unknown
    ipc.handle(channel, (event, args) => handler(args, event))
  }
}

/** main → renderer 푸시. 열린 모든 창에 보낸다. */
export type Broadcast = <K extends keyof IPush>(channel: K, payload: IPush[K]) => void
