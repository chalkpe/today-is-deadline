import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createIdleAlert } from './driver'

const make = (times = { idleMs: 300_000, repeatMs: 60_000 }) => {
  const play = vi.fn()
  const stop = vi.fn()
  const alert = createIdleAlert({
    getTimes: () => times,
    play,
    stop,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  })
  return { alert, play, stop, times }
}

describe('createIdleAlert', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('enable → 유휴 → 반복 → keydown → 다시 유휴', () => {
    const { alert, play, stop } = make()
    alert.dispatch('enable')
    expect(alert.state()).toBe('active')
    vi.advanceTimersByTime(300_000)
    expect(play).toHaveBeenCalledTimes(1)
    expect(alert.state()).toBe('alerting')
    vi.advanceTimersByTime(60_000)
    expect(play).toHaveBeenCalledTimes(2)
    alert.dispatch('keydown')
    expect(stop).toHaveBeenCalledTimes(1)
    expect(alert.state()).toBe('active')
    vi.advanceTimersByTime(300_000)
    expect(play).toHaveBeenCalledTimes(3)
  })

  it('두 번째 enable은 타이머를 재시작하지 않는다', () => {
    const { alert, play } = make()
    alert.dispatch('enable')
    vi.advanceTimersByTime(200_000)
    alert.dispatch('enable')
    vi.advanceTimersByTime(100_000)
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('disable 후 타이머가 남지 않는다', () => {
    const { alert, stop } = make()
    alert.dispatch('enable')
    vi.advanceTimersByTime(300_000)
    alert.dispatch('disable')
    expect(vi.getTimerCount()).toBe(0)
    expect(stop).toHaveBeenCalledTimes(1)
    expect(alert.state()).toBe('disabled')
  })

  it('alerting 중 suspend는 소리를 끄고 타이머를 취소, resume은 다시 건다', () => {
    const { alert, play, stop } = make()
    alert.dispatch('enable')
    vi.advanceTimersByTime(300_000)
    alert.dispatch('suspend')
    expect(stop).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
    alert.dispatch('keydown')
    expect(alert.state()).toBe('suspended')
    alert.dispatch('resume')
    expect(alert.state()).toBe('active')
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(300_000)
    expect(play).toHaveBeenCalledTimes(2)
  })

  it('타이머 시각에 현재 getTimes 값을 쓴다', () => {
    const { alert, play, times } = make()
    alert.dispatch('enable')
    times.idleMs = 20_000
    alert.dispatch('keydown')
    vi.advanceTimersByTime(20_000)
    expect(play).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['짧은', { idleMs: 1, repeatMs: 0 }, 10_000],
    ['긴', { idleMs: 1e15, repeatMs: Number.POSITIVE_INFINITY }, 86_400_000],
    ['NaN', { idleMs: Number.NaN, repeatMs: Number.NaN }, 10_000],
  ])('getTimes가 터무니없이 %s 값을 줘도 타이머는 10초~하루로 자른다', (_, times, clamped) => {
    const delays: number[] = []
    const setTimeout = ((fn: () => void, ms: number) => {
      delays.push(ms)
      return globalThis.setTimeout(fn, ms)
    }) as typeof globalThis.setTimeout
    const play = vi.fn()
    const alert = createIdleAlert({ getTimes: () => times, play, stop: () => {}, setTimeout, clearTimeout: globalThis.clearTimeout })
    alert.dispatch('enable')
    expect(delays).toEqual([clamped]) // 유휴 타이머
    vi.advanceTimersByTime(clamped - 1)
    expect(play).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(play).toHaveBeenCalledTimes(1)
    expect(delays).toEqual([clamped, clamped]) // 반복 타이머
  })

  it('keydown을 반복해도 타이머는 하나', () => {
    const { alert } = make()
    alert.dispatch('enable')
    alert.dispatch('keydown')
    alert.dispatch('keydown')
    expect(vi.getTimerCount()).toBe(1)
  })

  it('play 안에서 disable해도 타이머가 남지 않는다', () => {
    const ref: { alert?: ReturnType<typeof createIdleAlert> } = {}
    const alert = createIdleAlert({
      getTimes: () => ({ idleMs: 10_000, repeatMs: 10_000 }),
      play: () => ref.alert?.dispatch('disable'),
      stop: () => {},
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    })
    ref.alert = alert
    alert.dispatch('enable')
    vi.advanceTimersByTime(10_000)
    expect(alert.state()).toBe('disabled')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('play 안에서 keydown하면 유휴 타이머가 남아 다시 울린다', () => {
    const ref: { alert?: ReturnType<typeof createIdleAlert> } = {}
    let calls = 0
    const alert = createIdleAlert({
      getTimes: () => ({ idleMs: 10_000, repeatMs: 100_000 }),
      play: () => {
        calls++
        if (calls === 1) ref.alert?.dispatch('keydown')
      },
      stop: () => {},
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    })
    ref.alert = alert
    alert.dispatch('enable')
    vi.advanceTimersByTime(10_000)
    expect(alert.state()).toBe('active')
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(10_000)
    expect(calls).toBe(2)
  })

  it('play/stop이 throw해도 머신이 깨지지 않는다', () => {
    const alert = createIdleAlert({
      getTimes: () => ({ idleMs: 10_000, repeatMs: 10_000 }),
      play: () => {
        throw new Error('x')
      },
      stop: () => {
        throw new Error('y')
      },
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    })
    alert.dispatch('enable')
    vi.advanceTimersByTime(10_000)
    expect(alert.state()).toBe('alerting')
    expect(vi.getTimerCount()).toBe(1)
    alert.dispatch('keydown')
    expect(alert.state()).toBe('active')
    expect(vi.getTimerCount()).toBe(1)
  })
})
