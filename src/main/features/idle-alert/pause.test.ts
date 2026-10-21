import { describe, expect, it, vi } from 'vitest'
import { createPauseTracker, type PowerSignal } from './pause'

function setup() {
  const handlers = { suspend: vi.fn(), resume: vi.fn() }
  const signal = createPauseTracker(handlers)
  const run = (...signals: PowerSignal[]) => {
    for (const s of signals) signal(s)
  }
  return { handlers, run }
}

describe('createPauseTracker', () => {
  it('잠금 없이 잠들었다 깨면 멈췄다가 재개한다', () => {
    const t = setup()
    t.run('suspend')
    expect(t.handlers.suspend).toHaveBeenCalledTimes(1)
    t.run('resume')
    expect(t.handlers.resume).toHaveBeenCalledTimes(1)
  })

  it('화면만 잠갔다 풀면 멈췄다가 재개한다', () => {
    const t = setup()
    t.run('lock-screen', 'unlock-screen')
    expect(t.handlers.suspend).toHaveBeenCalledTimes(1)
    expect(t.handlers.resume).toHaveBeenCalledTimes(1)
  })

  it('잠긴 채 잠들었다 깨도 잠금 화면이면 재개하지 않고, 잠금을 풀 때 재개한다', () => {
    const t = setup()
    t.run('lock-screen', 'suspend', 'resume')
    expect(t.handlers.suspend).toHaveBeenCalledTimes(1)
    expect(t.handlers.resume).not.toHaveBeenCalled()
    t.run('unlock-screen')
    expect(t.handlers.resume).toHaveBeenCalledTimes(1)
  })

  it('깬 뒤에 잠금이 걸려도 잠금을 풀 때까지 멈춘다', () => {
    const t = setup()
    t.run('suspend', 'resume', 'lock-screen')
    expect(t.handlers.suspend).toHaveBeenCalledTimes(2)
    expect(t.handlers.resume).toHaveBeenCalledTimes(1)
    t.run('unlock-screen')
    expect(t.handlers.resume).toHaveBeenCalledTimes(2)
  })

  it('잠금 해제는 깨어 있다는 뜻이므로 resume를 놓쳐도 재개한다', () => {
    const t = setup()
    t.run('lock-screen', 'suspend', 'unlock-screen')
    expect(t.handlers.resume).toHaveBeenCalledTimes(1)
  })

  it('이미 멈췄거나 이미 돌고 있으면 같은 신호를 다시 알리지 않는다', () => {
    const t = setup()
    t.run('resume', 'unlock-screen')
    expect(t.handlers.resume).not.toHaveBeenCalled()
    t.run('suspend', 'suspend', 'lock-screen')
    expect(t.handlers.suspend).toHaveBeenCalledTimes(1)
  })
})
