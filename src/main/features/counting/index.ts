import type { Db } from '@main/shared/db'
import type { Broadcast } from '@main/shared/ipc'
import type { Logger } from '@main/shared/log'
import type { NativeHook } from '@main/shared/native'
import { type PermissionStatus, PUSH } from '@shared/ipc'
import type { Settings } from '@shared/model/settings'
import { powerMonitor } from 'electron'
import { createCounter } from './counter'
import { fileIconPng } from './icon'
import { createCountingSession } from './session'

export { type Counter, createCounter } from './counter'
export { fileIconPng } from './icon'
export { countingHandlers, INPUT_MONITORING_URL } from './ipc'
export { type CountingSession, createCountingSession } from './session'

/** 스펙 6.2: 5초마다 flush */
export const FLUSH_INTERVAL_MS = 5000

type Deps = {
  hook: NativeHook
  db: Db
  settings: { get(): Settings; onChange(listener: () => void): () => void }
  log: Logger
  send: Broadcast
}

export type Counting = {
  /** 권한 확인 → (허용·켜짐이면) 훅 시작. 시작 순서상 위젯 창을 만든 뒤 처음 부른다. */
  sync(): void
  status(): PermissionStatus
  requestPermission(): void
  isRunning(): boolean
  onKeydown(listener: () => void): () => void
  onTodayChanged(listener: () => void): () => void
  onRunningChange(listener: (running: boolean) => void): () => void
  /** 종료: 재확인을 멈추고 훅을 멈춘 뒤 남은 카운트를 flush한다. */
  stop(): void
}

/** 카운터와 권한 세션을 만들고 설정 변경(카운트 On/Off)·절전 진입·권한 변화에 반응하게 연결한다. */
export function createCounting({ hook, db, settings, log, send }: Deps): Counting {
  const runningListeners = new Set<(running: boolean) => void>()
  const counter = createCounter({
    hook,
    db,
    now: () => new Date(),
    flushIntervalMs: FLUSH_INTERVAL_MS,
    getIcon: fileIconPng,
    setInterval,
    clearInterval,
    onError: (err) => log.error('counter', err),
  })
  const session = createCountingSession({
    counter,
    permissionStatus: () => hook.permissionStatus(),
    settings,
    log,
    onStatus: (status) => send(PUSH.PERMISSION, status),
    onRunning: (running) => {
      for (const listener of [...runningListeners]) {
        try {
          listener(running)
        } catch (err) {
          log.error('counting: listener failed', err)
        }
      }
    },
  })
  settings.onChange(() => session.sync())
  powerMonitor.on('suspend', () => counter.flush())

  return {
    sync: session.sync,
    status: session.status,
    requestPermission: () => hook.requestPermission(),
    isRunning: counter.isRunning,
    onKeydown: counter.onKeydown,
    onTodayChanged: counter.onTodayChanged,
    onRunningChange(listener) {
      runningListeners.add(listener)
      return () => {
        runningListeners.delete(listener)
      }
    },
    stop() {
      session.dispose()
      counter.stop()
    },
  }
}
