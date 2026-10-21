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

  function dispatch(event: AlertEvent) {
    const next = reduceAlert(current, event)
    current = next.state
    for (const effect of next.effects) run(effect)
  }

  return { dispatch, state: () => current }
}
