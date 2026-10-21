import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debounce, throttle } from './index'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('debounce', () => {
  it('마지막 호출 뒤 ms가 지나야 한 번 실행한다', () => {
    const fn = vi.fn()
    const d = debounce(fn, 300)
    d.call()
    vi.advanceTimersByTime(200)
    d.call()
    vi.advanceTimersByTime(299)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('flush는 대기 중인 실행을 즉시 하고, 대기 중이 아니면 아무것도 하지 않는다', () => {
    const fn = vi.fn()
    const d = debounce(fn, 300)
    d.flush()
    expect(fn).not.toHaveBeenCalled()
    d.call()
    d.flush()
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('cancel은 대기 중인 실행을 버린다', () => {
    const fn = vi.fn()
    const d = debounce(fn, 300)
    d.call()
    d.cancel()
    vi.advanceTimersByTime(1000)
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('throttle', () => {
  it('첫 호출은 바로, 창 안의 나머지는 창 끝에 한 번으로 묶는다', () => {
    const fn = vi.fn()
    const t = throttle(fn, 1000)
    t.call()
    expect(fn).toHaveBeenCalledTimes(1)
    t.call()
    t.call()
    vi.advanceTimersByTime(999)
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('창 안에 추가 호출이 없으면 끝에 다시 실행하지 않고, 창이 지나면 다시 바로 실행한다', () => {
    const fn = vi.fn()
    const t = throttle(fn, 1000)
    t.call()
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
    t.call()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('끝 실행도 새 창을 열어 ms 안에 두 번 실행하지 않는다', () => {
    const fn = vi.fn()
    const t = throttle(fn, 1000)
    t.call()
    t.call()
    vi.advanceTimersByTime(1000) // 끝 실행(2회째)이 새 창을 연다
    t.call()
    expect(fn).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('cancel은 끝 실행을 버리고 창을 닫는다', () => {
    const fn = vi.fn()
    const t = throttle(fn, 1000)
    t.call()
    t.call()
    t.cancel()
    vi.advanceTimersByTime(5000)
    expect(fn).toHaveBeenCalledTimes(1)
    t.call()
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
