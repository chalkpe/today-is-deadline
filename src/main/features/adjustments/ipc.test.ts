import { openDb } from '@main/shared/db'
import { INVALID_DATE } from '@main/shared/ipc'
import { describe, expect, it, vi } from 'vitest'
import { adjustmentHandlers, INVALID_ADJUSTMENT_ID } from './ipc'

const NOW = new Date(Date.UTC(2026, 9, 22, 3, 0))

function setup() {
  const db = openDb(':memory:')
  const send = vi.fn()
  const pushToday = vi.fn()
  return { h: adjustmentHandlers({ db, now: () => NOW, send, pushToday }), send, pushToday }
}

describe('adjustmentHandlers', () => {
  it('adjust:add는 저장한 항목을 돌려주고, 바뀐 목록과 오늘 통계를 보낸다', () => {
    const { h, send, pushToday } = setup()
    const added = h['adjust:add']({ date: '2026-10-22', delta: 500, memo: '회의록' })
    expect(added).toEqual({ id: 1, date: '2026-10-22', delta: 500, memo: '회의록', createdAt: '2026-10-22T03:00:00.000Z' })
    expect(send).toHaveBeenCalledWith('push:adjustments', [added])
    expect(pushToday).toHaveBeenCalledTimes(1)
    expect(h['adjust:list']()).toEqual([added])
  })

  it('adjust:add는 잘못된 날짜를 거부하고 아무것도 저장·알리지 않는다', () => {
    const { h, send, pushToday } = setup()
    expect(() => h['adjust:add']({ date: '2026-02-30', delta: 500, memo: '' })).toThrow(INVALID_DATE)
    expect(() => h['adjust:add'](null as never)).toThrow(INVALID_DATE)
    expect(h['adjust:list']()).toEqual([])
    expect(send).not.toHaveBeenCalled()
    expect(pushToday).not.toHaveBeenCalled()
  })

  it('adjust:add는 0이나 정수가 아닌 조정값을 거부한다', () => {
    const { h, send } = setup()
    expect(() => h['adjust:add']({ date: '2026-10-22', delta: 0, memo: '' })).toThrow('조정값은 0이 아닌 정수여야 합니다')
    expect(() => h['adjust:add']({ date: '2026-10-22', delta: '5' as never, memo: '' })).toThrow('조정값은 0이 아닌 정수여야 합니다')
    expect(send).not.toHaveBeenCalled()
  })

  it('메모가 문자열이 아니면 빈 메모로 저장한다', () => {
    const { h } = setup()
    expect(h['adjust:add']({ date: '2026-10-22', delta: -3, memo: undefined as never }).memo).toBe('')
  })

  it('adjust:remove는 지우고 남은 목록과 오늘 통계를 보낸다', () => {
    const { h, send, pushToday } = setup()
    const a = h['adjust:add']({ date: '2026-10-21', delta: 1, memo: '' })
    const b = h['adjust:add']({ date: '2026-10-22', delta: 2, memo: '' })
    send.mockClear()
    pushToday.mockClear()
    h['adjust:remove'](a.id)
    expect(send).toHaveBeenCalledWith('push:adjustments', [b])
    expect(pushToday).toHaveBeenCalledTimes(1)
  })

  it('adjust:remove는 정수가 아닌 id를 거부한다', () => {
    const { h, send } = setup()
    expect(() => h['adjust:remove']('1' as never)).toThrow(INVALID_ADJUSTMENT_ID)
    expect(() => h['adjust:remove'](1.5)).toThrow(INVALID_ADJUSTMENT_ID)
    expect(send).not.toHaveBeenCalled()
  })
})
