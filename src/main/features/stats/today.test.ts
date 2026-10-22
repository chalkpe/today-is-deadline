import { upsertApp } from '@main/entities/app'
import { recordMinutes } from '@main/entities/stat'
import { openDb } from '@main/shared/db'
import { DEFAULT_SETTINGS, type Settings } from '@shared/model/settings'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTodayPusher } from './today'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const withFilter = (enabled: boolean, included: string[] = []): Settings => ({ ...DEFAULT_SETTINGS, filter: { enabled, included } })

function setup(initial: Settings = DEFAULT_SETTINGS) {
  const db = openDb(':memory:')
  upsertApp(db, { id: 'vscode', name: 'VS Code', path: '' }, null, 't')
  const send = vi.fn()
  const log = { error: vi.fn() }
  let current = initial
  const listeners: ((next: Settings, prev: Settings) => void)[] = []
  const settings = {
    get: () => current,
    onChange(listener: (next: Settings, prev: Settings) => void) {
      listeners.push(listener)
      return () => {}
    },
  }
  const change = (next: Settings) => {
    const prev = current
    current = next
    for (const listener of listeners) listener(next, prev)
  }
  const pusher = createTodayPusher({ db, now: () => new Date(2026, 9, 22, 9, 0), settings, send, log })
  const add = (count: number) => recordMinutes(db, [{ date: '2026-10-22', minute: 540, appId: 'vscode', count }])
  return { db, send, log, pusher, add, change }
}

describe('createTodayPusher', () => {
  it('1초에 한 번까지만 보내고, 창 끝에는 그때의 최신 값을 보낸다', () => {
    const { send, pusher, add } = setup()
    add(10)
    pusher.push()
    add(5)
    pusher.push()
    pusher.push()
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toBe('push:today')
    expect(send.mock.calls[0][1]).toMatchObject({ date: '2026-10-22', total: 10 })
    vi.advanceTimersByTime(1000)
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[1][1]).toMatchObject({ total: 15 })
  })

  it('pushNow는 스로틀과 무관하게 바로 보낸다', () => {
    const { send, pusher } = setup()
    pusher.push()
    pusher.pushNow()
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('앱 필터를 적용해 계산한다', () => {
    const { send, pusher, add } = setup(withFilter(true, ['slack']))
    add(10)
    pusher.pushNow()
    expect(send.mock.calls[0][1]).toMatchObject({ total: 0, apps: [] })
  })

  it('앱 범위가 바뀔 때만 바로 다시 보낸다', () => {
    const { send, add, change } = setup()
    add(10)
    change({ ...DEFAULT_SETTINGS, widget: { ...DEFAULT_SETTINGS.widget, x: 5 } })
    // 꺼진 필터의 목록만 바뀌면 범위는 그대로(모든 앱)다
    change(withFilter(false, ['vscode']))
    expect(send).not.toHaveBeenCalled()
    change(withFilter(true, ['vscode']))
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][1]).toMatchObject({ total: 10 })
    change(withFilter(true, []))
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[1][1]).toMatchObject({ total: 0 })
  })

  it('조회 실패는 던지지 않고 로그로 남긴다', () => {
    const { db, send, log, pusher } = setup()
    db.close()
    expect(() => pusher.push()).not.toThrow()
    expect(send).not.toHaveBeenCalled()
    expect(log.error).toHaveBeenCalledTimes(1)
  })

  it('cancel 뒤에는 대기 중인 끝 전송이 없다', () => {
    const { send, pusher } = setup()
    pusher.push()
    pusher.push()
    pusher.cancel()
    vi.advanceTimersByTime(5000)
    expect(send).toHaveBeenCalledTimes(1)
  })
})
