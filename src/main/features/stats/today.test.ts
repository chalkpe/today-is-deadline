import { upsertApp } from '@main/entities/app'
import { recordMinutes } from '@main/entities/stat'
import { openDb } from '@main/shared/db'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTodayPusher } from './today'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup() {
  const db = openDb(':memory:')
  upsertApp(db, { id: 'vscode', name: 'VS Code', path: '' }, null, 't')
  const send = vi.fn()
  const log = { error: vi.fn() }
  const pusher = createTodayPusher({ db, now: () => new Date(2026, 9, 22, 9, 0), send, log })
  const add = (count: number) => recordMinutes(db, [{ date: '2026-10-22', minute: 540, appId: 'vscode', count }])
  return { db, send, log, pusher, add }
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
