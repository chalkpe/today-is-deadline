import { describe, expect, it } from 'vitest'
import { type AlertEvent, type AlertState, reduceAlert } from './reducer'

describe('reduceAlert 표', () => {
  it('disabled + enable', () => {
    expect(reduceAlert('disabled', 'enable')).toEqual({ state: 'active', effects: ['startIdleTimer'] })
  })
  it('active + keydown', () => {
    expect(reduceAlert('active', 'keydown')).toEqual({ state: 'active', effects: ['startIdleTimer'] })
  })
  it('active + idleElapsed', () => {
    expect(reduceAlert('active', 'idleElapsed')).toEqual({ state: 'alerting', effects: ['playSound', 'startRepeatTimer'] })
  })
  it('alerting + repeatElapsed', () => {
    expect(reduceAlert('alerting', 'repeatElapsed')).toEqual({ state: 'alerting', effects: ['playSound', 'startRepeatTimer'] })
  })
  it('alerting + keydown', () => {
    expect(reduceAlert('alerting', 'keydown')).toEqual({ state: 'active', effects: ['stopSound', 'startIdleTimer'] })
  })
  it('active/alerting + suspend', () => {
    expect(reduceAlert('active', 'suspend')).toEqual({ state: 'suspended', effects: ['stopSound', 'cancelTimers'] })
    expect(reduceAlert('alerting', 'suspend')).toEqual({ state: 'suspended', effects: ['stopSound', 'cancelTimers'] })
  })
  it('suspended + resume', () => {
    expect(reduceAlert('suspended', 'resume')).toEqual({ state: 'active', effects: ['startIdleTimer'] })
  })
  it('suspended + keydown은 resume처럼 다시 건다(resume·잠금 해제를 놓쳐도 입력이 오면 깨어 있다)', () => {
    expect(reduceAlert('suspended', 'keydown')).toEqual({ state: 'active', effects: ['startIdleTimer'] })
  })
  it('비활성 외 상태 + disable', () => {
    for (const s of ['active', 'alerting', 'suspended'] as AlertState[]) {
      expect(reduceAlert(s, 'disable')).toEqual({ state: 'disabled', effects: ['stopSound', 'cancelTimers'] })
    }
  })
})

describe('reduceAlert 표 밖 조합', () => {
  const noop: [AlertState, AlertEvent][] = [
    ['disabled', 'keydown'],
    ['disabled', 'suspend'],
    ['disabled', 'disable'],
    ['active', 'resume'],
    ['active', 'repeatElapsed'],
    ['active', 'enable'],
    ['alerting', 'enable'],
    ['suspended', 'enable'],
    ['suspended', 'idleElapsed'],
    ['suspended', 'repeatElapsed'],
    ['disabled', 'idleElapsed'],
    ['alerting', 'idleElapsed'],
    ['alerting', 'resume'],
    ['suspended', 'suspend'],
  ]
  it.each(noop)('%s + %s 은 상태 유지·효과 없음', (state, event) => {
    expect(reduceAlert(state, event)).toEqual({ state, effects: [] })
  })
})
