import { normalizeApp, upsertApp } from '@main/entities/app'
import { type MinuteEntry, recordMinutes } from '@main/entities/stat'
import type { Db } from '@main/shared/db'
import type { NativeHook } from '@main/shared/native'
import { minuteOfDay, toDateKey } from '@shared/model/calendar'

export type Counter = {
  start(): void
  stop(): void
  flush(): void
  isRunning(): boolean
  onKeydown(listener: () => void): () => void
  onTodayChanged(listener: () => void): () => void
  pending(): number
}

export type CounterDeps = {
  hook: NativeHook
  db: Db
  now: () => Date
  flushIntervalMs: number
  getIcon: (path: string) => Promise<Uint8Array | null>
  setInterval: typeof globalThis.setInterval
  clearInterval: typeof globalThis.clearInterval
  onError?: (err: unknown) => void
}

export function createCounter(deps: CounterDeps): Counter {
  const { hook, db, now, flushIntervalMs, getIcon } = deps
  const report = (err: unknown) => {
    try {
      deps.onError?.(err)
    } catch {
      // 오류 보고자체의 예외는 무시한다
    }
  }

  const counts = new Map<string, number>()
  const seenApps = new Set<string>()
  const keydownListeners = new Set<() => void>()
  const changedListeners = new Set<() => void>()
  let running = false
  let timer: ReturnType<typeof setInterval> | null = null

  const notify = (listeners: Set<() => void>) => {
    for (const l of [...listeners]) {
      try {
        l()
      } catch (err) {
        report(err)
      }
    }
  }

  const subscribe = (listeners: Set<() => void>, listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  const flush = () => {
    if (counts.size === 0) return
    const entries: MinuteEntry[] = []
    for (const [key, count] of counts) {
      const [date, minute, ...rest] = key.split('|')
      entries.push({ date, minute: Number(minute), appId: rest.join('|'), count })
    }
    try {
      recordMinutes(db, entries)
    } catch (err) {
      report(err)
      return
    }
    counts.clear()
    notify(changedListeners)
  }

  const onNativeKeydown = (raw: Parameters<Parameters<NativeHook['start']>[0]>[0]) => {
    if (!running) return
    try {
      const app = normalizeApp(raw)
      const at = now()
      if (!seenApps.has(app.id)) {
        seenApps.add(app.id)
        upsertApp(db, app, null, at.toISOString())
        if (app.path !== '') {
          getIcon(app.path)
            .then((png) => {
              if (png) upsertApp(db, app, png, now().toISOString())
            })
            .catch(() => {})
        }
      }
      const key = `${toDateKey(at)}|${minuteOfDay(at)}|${app.id}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
      notify(keydownListeners)
    } catch (err) {
      report(err)
    }
  }

  return {
    start() {
      if (running) return
      running = true
      hook.start(onNativeKeydown)
      timer = deps.setInterval(flush, flushIntervalMs)
    },
    stop() {
      if (!running) return
      running = false
      hook.stop()
      if (timer !== null) deps.clearInterval(timer)
      timer = null
      flush()
    },
    flush,
    isRunning: () => running,
    onKeydown: (l) => subscribe(keydownListeners, l),
    onTodayChanged: (l) => subscribe(changedListeners, l),
    pending() {
      let sum = 0
      for (const c of counts.values()) sum += c
      return sum
    },
  }
}
