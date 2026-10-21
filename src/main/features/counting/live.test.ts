import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushWhileTyping } from './live'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function makeCounter() {
  const listeners = new Set<() => void>()
  return {
    flush: vi.fn(),
    onKeydown: vi.fn((listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }),
    keydown: () => {
      for (const l of listeners) l()
    },
    listenerCount: () => listeners.size,
  }
}

describe('flushWhileTyping', () => {
  it('첫 키다운에 바로 flush하고, 계속 치는 동안은 1초에 한 번만 flush한다', () => {
    const counter = makeCounter()
    flushWhileTyping(counter)
    counter.keydown()
    expect(counter.flush).toHaveBeenCalledTimes(1)
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(100)
      counter.keydown()
    }
    // 0ms 앞 실행 + 1000ms 끝 실행. 1000ms의 마지막 키다운은 새 창의 끝(2000ms)에 flush된다
    expect(counter.flush).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(1000)
    expect(counter.flush).toHaveBeenCalledTimes(3)
    vi.advanceTimersByTime(5000)
    expect(counter.flush).toHaveBeenCalledTimes(3)
  })

  it('창 끝에 남은 키다운을 놓치지 않고 flush한다', () => {
    const counter = makeCounter()
    flushWhileTyping(counter)
    counter.keydown()
    vi.advanceTimersByTime(500)
    counter.keydown()
    expect(counter.flush).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(500)
    expect(counter.flush).toHaveBeenCalledTimes(2)
  })

  it('해제하면 구독을 끊고 대기 중인 flush도 버린다', () => {
    const counter = makeCounter()
    const stop = flushWhileTyping(counter)
    counter.keydown()
    counter.keydown()
    stop()
    expect(counter.listenerCount()).toBe(0)
    vi.advanceTimersByTime(5000)
    expect(counter.flush).toHaveBeenCalledTimes(1)
  })
})
