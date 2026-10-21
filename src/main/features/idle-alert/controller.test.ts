import { DEFAULT_SETTINGS, type Settings } from '@shared/model/settings'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAlertController } from './controller'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(env = { alert: true, counting: true, running: true }) {
  const settings = {
    get: (): Settings => ({
      ...DEFAULT_SETTINGS,
      counting: { enabled: env.counting },
      alert: { ...DEFAULT_SETTINGS.alert, enabled: env.alert, idleSeconds: 10, repeatSeconds: 20 },
    }),
  }
  const send = vi.fn()
  const log = { info: vi.fn() }
  const controller = createAlertController({
    settings,
    isCounting: () => env.running,
    soundUrl: (sound) => (sound.kind === 'builtin' ? `sound://builtin/${sound.name}` : 'sound://file'),
    send,
    log,
  })
  return { env, send, log, controller }
}

describe('createAlertController', () => {
  it('알림·카운트가 켜져 있고 훅이 돌면 T1 뒤 재생, 이후 T2마다 반복', () => {
    const t = setup()
    t.controller.sync()
    vi.advanceTimersByTime(9_999)
    expect(t.send).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(t.send).toHaveBeenLastCalledWith({ action: 'play', url: 'sound://builtin/rooster' })
    expect(t.log.info).toHaveBeenLastCalledWith('push:alert play sound://builtin/rooster')
    vi.advanceTimersByTime(20_000)
    expect(t.send).toHaveBeenCalledTimes(2)
  })

  it('울리는 중 키다운이 오면 멈추고 유휴 타이머를 다시 건다', () => {
    const t = setup()
    t.controller.sync()
    vi.advanceTimersByTime(10_000)
    t.controller.dispatch('keydown')
    expect(t.send).toHaveBeenLastCalledWith({ action: 'stop' })
    expect(t.log.info).toHaveBeenLastCalledWith('push:alert stop')
    expect(t.controller.state()).toBe('active')
  })

  it.each([
    ['알림 꺼짐', { alert: false, counting: true, running: true }],
    ['카운트 꺼짐', { alert: true, counting: false, running: false }],
    ['훅이 돌지 않음(권한 거부)', { alert: true, counting: true, running: false }],
  ])('%s이면 비활성', (_name, env) => {
    const t = setup(env)
    t.controller.sync()
    vi.advanceTimersByTime(60_000)
    expect(t.send).not.toHaveBeenCalled()
    expect(t.controller.state()).toBe('disabled')
  })

  it('설정이 바뀐 뒤 sync하면 꺼지고 소리를 멈춘다', () => {
    const t = setup()
    t.controller.sync()
    vi.advanceTimersByTime(10_000)
    t.env.alert = false
    t.controller.sync()
    expect(t.send).toHaveBeenLastCalledWith({ action: 'stop' })
    expect(t.controller.state()).toBe('disabled')
    vi.advanceTimersByTime(60_000)
    expect(t.send).toHaveBeenCalledTimes(2)
  })
})
