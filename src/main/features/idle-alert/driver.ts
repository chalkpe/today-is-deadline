import { type AlertEffect, type AlertEvent, type AlertState, reduceAlert } from './reducer'

export type IdleAlert = { dispatch(event: AlertEvent): void; state(): AlertState }

export type IdleAlertDeps = {
  getTimes: () => { idleMs: number; repeatMs: number }
  play: () => void
  stop: () => void
  setTimeout: typeof globalThis.setTimeout
  clearTimeout: typeof globalThis.clearTimeout
}

export function createIdleAlert(deps: IdleAlertDeps): IdleAlert {
  let current: AlertState = 'disabled'
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined

  const clear = () => {
    if (timer !== undefined) deps.clearTimeout(timer)
    timer = undefined
  }

  const schedule = (ms: number, event: AlertEvent) => {
    clear()
    timer = deps.setTimeout(() => {
      timer = undefined
      dispatch(event)
    }, ms)
  }

  const safe = (fn: () => void) => {
    try {
      fn()
    } catch {
      // 콜백 실패가 상태 머신을 깨뜨리지 않도록 무시한다
    }
  }

  const run = (effect: AlertEffect) => {
    switch (effect) {
      case 'startIdleTimer':
        return schedule(deps.getTimes().idleMs, 'idleElapsed')
      case 'startRepeatTimer':
        return schedule(deps.getTimes().repeatMs, 'repeatElapsed')
      case 'cancelTimers':
        return clear()
      case 'playSound':
        return safe(deps.play)
      case 'stopSound':
        return safe(deps.stop)
    }
  }

  // run-to-completion: 효과 실행 중 들어온 이벤트는 큐에 넣고, 바깥 루프가 순서대로 처리한다
  const queue: AlertEvent[] = []
  let running = false

  function dispatch(event: AlertEvent) {
    queue.push(event)
    if (running) return
    running = true
    try {
      for (let e = queue.shift(); e !== undefined; e = queue.shift()) {
        const next = reduceAlert(current, e)
        current = next.state
        for (const effect of next.effects) run(effect)
      }
    } finally {
      running = false
    }
  }

  return { dispatch, state: () => current }
}
