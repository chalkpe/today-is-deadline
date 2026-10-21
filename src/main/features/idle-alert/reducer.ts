export type AlertState = 'disabled' | 'active' | 'alerting' | 'suspended'
export type AlertEvent = 'enable' | 'disable' | 'keydown' | 'idleElapsed' | 'repeatElapsed' | 'suspend' | 'resume'
export type AlertEffect = 'startIdleTimer' | 'startRepeatTimer' | 'cancelTimers' | 'playSound' | 'stopSound'

export type AlertTransition = { state: AlertState; effects: AlertEffect[] }

/** 스펙 10.1 전이표. 표에 없는 조합은 상태를 유지하고 효과를 내지 않는다. */
export function reduceAlert(state: AlertState, event: AlertEvent): AlertTransition {
  if (event === 'disable' && state !== 'disabled') {
    return { state: 'disabled', effects: ['stopSound', 'cancelTimers'] }
  }
  if (event === 'suspend' && (state === 'active' || state === 'alerting')) {
    return { state: 'suspended', effects: ['stopSound', 'cancelTimers'] }
  }
  if (event === 'enable' && state === 'disabled') return { state: 'active', effects: ['startIdleTimer'] }
  // 키 입력이 왔다면 깨어 있다는 뜻이므로 resume·잠금 해제 신호를 놓쳤어도 suspended에 갇히지 않게 resume처럼 다룬다
  if ((event === 'resume' || event === 'keydown') && state === 'suspended') return { state: 'active', effects: ['startIdleTimer'] }
  if (event === 'keydown' && state === 'active') return { state: 'active', effects: ['startIdleTimer'] }
  if (event === 'keydown' && state === 'alerting') return { state: 'active', effects: ['stopSound', 'startIdleTimer'] }
  if (event === 'idleElapsed' && state === 'active') return { state: 'alerting', effects: ['playSound', 'startRepeatTimer'] }
  if (event === 'repeatElapsed' && state === 'alerting') return { state: 'alerting', effects: ['playSound', 'startRepeatTimer'] }
  return { state, effects: [] }
}
