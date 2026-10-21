import { getApp } from '@main/entities/app'
import { dayTotals } from '@main/entities/stat'
import { type Db, openDb } from '@main/shared/db'
import type { AppIdentity, NativeHook } from '@main/shared/native'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCounter } from './counter'

const APP: AppIdentity = { id: 'com.a', name: 'A', path: '/a' }
let db: Db
let cb: (app: AppIdentity | null) => void
let current: Date
let stopped: number

const hook: NativeHook = {
  start: (c) => {
    cb = c
  },
  stop: () => {
    stopped++
  },
  permissionStatus: () => 'granted',
  requestPermission: () => {},
  currentApp: () => null,
}

const make = (extra: Partial<Parameters<typeof createCounter>[0]> = {}) =>
  createCounter({
    hook,
    db,
    now: () => current,
    flushIntervalMs: 5000,
    getIcon: async () => null,
    setInterval,
    clearInterval,
    ...extra,
  })

const total = (date: string) => dayTotals(db, date, date)[0].total

beforeEach(() => {
  vi.useFakeTimers()
  db = openDb(':memory:')
  current = new Date(2026, 9, 22, 12, 0, 0)
  stopped = 0
})
afterEach(() => {
  vi.useRealTimers()
  db.close()
})

describe('createCounter', () => {
  it('같은 분 3번 -> 주기 flush 후 기록', () => {
    const c = make()
    c.start()
    cb(APP)
    cb(APP)
    cb(APP)
    expect(c.pending()).toBe(3)
    vi.advanceTimersByTime(5000)
    expect(total('2026-10-22')).toBe(3)
    expect(c.pending()).toBe(0)
    c.stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('자정을 넘기면 서로 다른 날짜로 기록', () => {
    const c = make()
    c.start()
    current = new Date(2026, 9, 22, 23, 59, 30)
    cb(APP)
    current = new Date(2026, 9, 23, 0, 0, 10)
    cb(APP)
    c.flush()
    expect(total('2026-10-22')).toBe(1)
    expect(total('2026-10-23')).toBe(1)
    c.stop()
  })

  it('flush 실패는 삼키고 유지, 복구 후 기록', () => {
    const onError = vi.fn()
    const c = make({ onError })
    c.start()
    cb(APP)
    db.sqlite.exec('DROP TABLE minute_counts')
    expect(() => c.flush()).not.toThrow()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(c.pending()).toBe(1)
    db.sqlite.exec(
      'CREATE TABLE minute_counts (date TEXT NOT NULL, minute INTEGER NOT NULL, app_id TEXT NOT NULL REFERENCES apps(id), count INTEGER NOT NULL, PRIMARY KEY (date, minute, app_id))',
    )
    c.flush()
    expect(c.pending()).toBe(0)
    expect(total('2026-10-22')).toBe(1)
    c.stop()
  })

  it('null 앱은 unknown으로 기록', () => {
    const c = make()
    c.start()
    cb(null)
    c.flush()
    expect(getApp(db, 'unknown')).not.toBeNull()
    expect(total('2026-10-22')).toBe(1)
    c.stop()
  })

  it('onKeydown 리스너는 호출마다 한 번, 해제 가능, 예외 격리', () => {
    const c = make()
    const l = vi.fn()
    const off = c.onKeydown(l)
    c.onKeydown(() => {
      throw new Error('x')
    })
    c.start()
    cb(APP)
    cb(APP)
    expect(l).toHaveBeenCalledTimes(2)
    expect(c.pending()).toBe(2)
    off()
    cb(APP)
    expect(l).toHaveBeenCalledTimes(2)
    c.stop()
  })

  it('stop 후 콜백은 무시되고 stop이 flush한다', () => {
    const c = make()
    c.start()
    c.start()
    expect(c.isRunning()).toBe(true)
    cb(APP)
    c.stop()
    expect(stopped).toBe(1)
    expect(c.isRunning()).toBe(false)
    expect(total('2026-10-22')).toBe(1)
    cb(APP)
    expect(c.pending()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('콜백 내부 예외는 전파되지 않고 onError로 보고', () => {
    const onError = vi.fn()
    const c = make({
      onError,
      now: () => {
        throw new Error('boom')
      },
    })
    c.start()
    expect(() => cb(APP)).not.toThrow()
    expect(onError).toHaveBeenCalled()
    c.stop()
  })

  it('첫 flush 전에 앱 행이 있고 아이콘은 getIcon 이후 기록', async () => {
    const png = new Uint8Array([1, 2, 3])
    const getIcon = vi.fn(async () => png)
    const c = make({ getIcon })
    c.start()
    cb(APP)
    expect(getApp(db, APP.id)?.iconPng).toBeNull()
    cb(APP)
    expect(getIcon).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(0)
    expect(getApp(db, APP.id)?.iconPng).toEqual(png)
    c.stop()
  })

  it('getIcon 거부는 삼킨다', async () => {
    const c = make({ getIcon: () => Promise.reject(new Error('no')) })
    c.start()
    cb(APP)
    await vi.advanceTimersByTimeAsync(0)
    expect(getApp(db, APP.id)?.iconPng).toBeNull()
    c.stop()
  })

  it('flush 성공 시 onTodayChanged 알림, 빈 flush는 알리지 않음', () => {
    const c = make()
    const l = vi.fn()
    c.onTodayChanged(l)
    c.start()
    c.flush()
    expect(l).not.toHaveBeenCalled()
    cb(APP)
    c.flush()
    expect(l).toHaveBeenCalledTimes(1)
    c.stop()
  })
})
