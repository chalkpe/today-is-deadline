import type { PermissionStatus } from '@shared/ipc'
import { DEFAULT_SETTINGS, type Settings } from '@shared/model/settings'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCountingSession } from './session'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(initial: { status?: PermissionStatus; enabled?: boolean; failures?: number } = {}) {
  const env = { status: initial.status ?? 'granted', enabled: initial.enabled ?? true, failures: initial.failures ?? 0 }
  let running = false
  const counter = {
    start: vi.fn(() => {
      if (env.failures > 0) {
        env.failures--
        throw new Error('키보드 탭을 만들 수 없습니다')
      }
      running = true
    }),
    stop: vi.fn(() => {
      running = false
    }),
    isRunning: () => running,
  }
  const permissionStatus = vi.fn(() => env.status)
  const requestPermission = vi.fn()
  const settings = {
    get: (): Settings => ({ ...DEFAULT_SETTINGS, counting: { enabled: env.enabled } }),
  }
  const log = { info: vi.fn(), error: vi.fn() }
  const onStatus = vi.fn()
  const onRunning = vi.fn()
  const session = createCountingSession({ counter, permissionStatus, requestPermission, settings, log, onStatus, onRunning })
  return { env, counter, permissionStatus, requestPermission, log, onStatus, onRunning, session }
}

describe('createCountingSession', () => {
  it('허용 + 켜짐이면 카운터를 시작하고 상태·실행을 한 번씩 알린다', () => {
    const t = setup()
    t.session.sync()
    expect(t.counter.start).toHaveBeenCalledTimes(1)
    expect(t.session.status()).toBe('granted')
    expect(t.onStatus.mock.calls).toEqual([['granted']])
    expect(t.onRunning.mock.calls).toEqual([[true]])
    expect(t.log.info).toHaveBeenCalledWith('permission: granted')
    expect(t.log.info).toHaveBeenCalledWith('counting: started')
  })

  it('not-required(Windows)도 시작한다', () => {
    const t = setup({ status: 'not-required' })
    t.session.sync()
    expect(t.counter.start).toHaveBeenCalledTimes(1)
    expect(t.session.status()).toBe('not-required')
  })

  it('거부면 시작하지 않고 2초마다 다시 확인하다가, 허용되면 시작하고 확인을 멈춘다', () => {
    const t = setup({ status: 'denied' })
    t.session.sync()
    expect(t.counter.start).not.toHaveBeenCalled()
    expect(t.session.status()).toBe('denied')
    expect(t.log.info).toHaveBeenCalledWith('permission: denied')
    vi.advanceTimersByTime(4000)
    expect(t.permissionStatus).toHaveBeenCalledTimes(3)
    expect(t.onStatus).toHaveBeenCalledTimes(1) // 같은 상태는 다시 알리지 않는다
    t.env.status = 'granted'
    vi.advanceTimersByTime(2000)
    expect(t.counter.start).toHaveBeenCalledTimes(1)
    expect(t.onStatus.mock.calls).toEqual([['denied'], ['granted']])
    const calls = t.permissionStatus.mock.calls.length
    vi.advanceTimersByTime(10_000)
    expect(t.permissionStatus).toHaveBeenCalledTimes(calls)
  })

  it('꺼져 있으면 허용이어도 시작하지 않고, 켜지면 sync에서 시작한다', () => {
    const t = setup({ enabled: false })
    t.session.sync()
    expect(t.counter.start).not.toHaveBeenCalled()
    expect(t.session.status()).toBe('granted')
    t.env.enabled = true
    t.session.sync()
    expect(t.counter.start).toHaveBeenCalledTimes(1)
  })

  it('켜짐 → 꺼짐이면 카운터를 멈추고 실행 변화를 알린다', () => {
    const t = setup()
    t.session.sync()
    t.env.enabled = false
    t.session.sync()
    expect(t.counter.stop).toHaveBeenCalledTimes(1)
    expect(t.onRunning.mock.calls).toEqual([[true], [false]])
    expect(t.log.info).toHaveBeenCalledWith('counting: stopped')
  })

  it('start가 던지면 거부로 보고 2초마다 재시도하며, 연속 실패는 한 번만 기록한다', () => {
    const t = setup({ failures: 3 })
    expect(() => t.session.sync()).not.toThrow()
    expect(t.session.status()).toBe('denied')
    expect(t.onRunning).not.toHaveBeenCalled()
    vi.advanceTimersByTime(4000) // 실패 2회 더
    expect(t.counter.start).toHaveBeenCalledTimes(3)
    expect(t.log.error).toHaveBeenCalledTimes(1)
    expect(t.log.error.mock.calls[0][0]).toBe('counting: start failed')
    vi.advanceTimersByTime(2000) // 성공
    expect(t.counter.start).toHaveBeenCalledTimes(4)
    expect(t.session.status()).toBe('granted')
    expect(t.onStatus.mock.calls).toEqual([['denied'], ['granted']])
    expect(t.onRunning.mock.calls).toEqual([[true]])
  })

  it('실행 중에는 sync를 반복해도 다시 시작하지 않는다', () => {
    const t = setup()
    t.session.sync()
    t.session.sync()
    expect(t.counter.start).toHaveBeenCalledTimes(1)
    expect(t.onStatus).toHaveBeenCalledTimes(1)
  })

  it('처음 거부를 보면 권한 요청을 한 번 부르고, 이후 재확인·다시 거부돼도 부르지 않는다', () => {
    const t = setup({ status: 'denied' })
    t.session.sync()
    expect(t.requestPermission).toHaveBeenCalledTimes(1)
    expect(t.log.info).toHaveBeenCalledWith('permission: requested')
    vi.advanceTimersByTime(10_000)
    t.session.sync()
    expect(t.requestPermission).toHaveBeenCalledTimes(1)
    t.env.status = 'granted'
    vi.advanceTimersByTime(2000)
    t.env.status = 'denied'
    t.session.sync()
    vi.advanceTimersByTime(4000)
    expect(t.requestPermission).toHaveBeenCalledTimes(1)
  })

  it('처음부터 허용이거나 not-required면 권한 요청을 부르지 않는다', () => {
    for (const status of ['granted', 'not-required'] as const) {
      const t = setup({ status })
      t.session.sync()
      t.session.sync()
      expect(t.requestPermission).not.toHaveBeenCalled()
    }
  })

  it('훅 시작 실패로 생긴 거부(OS 상태는 허용)에는 권한 요청을 부르지 않는다', () => {
    const t = setup({ failures: 2 })
    t.session.sync()
    vi.advanceTimersByTime(4000)
    expect(t.session.status()).toBe('granted')
    expect(t.requestPermission).not.toHaveBeenCalled()
  })

  it('권한 요청이 던져도 기록만 하고 안내·재확인은 그대로 간다', () => {
    const t = setup({ status: 'denied' })
    t.requestPermission.mockImplementation(() => {
      throw new Error('요청 실패')
    })
    expect(() => t.session.sync()).not.toThrow()
    expect(t.log.error.mock.calls[0][0]).toBe('permission: request failed')
    expect(t.session.status()).toBe('denied')
    vi.advanceTimersByTime(4000)
    expect(t.requestPermission).toHaveBeenCalledTimes(1)
    expect(t.permissionStatus).toHaveBeenCalledTimes(3)
  })

  it('dispose는 재확인을 멈춘다', () => {
    const t = setup({ status: 'denied' })
    t.session.sync()
    t.session.dispose()
    vi.advanceTimersByTime(10_000)
    expect(t.permissionStatus).toHaveBeenCalledTimes(1)
  })
})
