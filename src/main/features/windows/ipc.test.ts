import { INVALID_DATE } from '@main/shared/ipc'
import { describe, expect, it, vi } from 'vitest'
import { windowHandlers } from './ipc'

const setup = () => {
  const windows = { resizeWidget: vi.fn(), openSecondary: vi.fn() }
  return { windows, h: windowHandlers(windows) }
}

describe('windowHandlers', () => {
  it('widget:resize는 요청을 그대로 넘긴다(검증·잠금 처리는 resizeTarget)', () => {
    const { windows, h } = setup()
    h['widget:resize']({ height: 300 })
    expect(windows.resizeWidget).toHaveBeenCalledWith({ height: 300 })
  })

  it('widget:openStats는 날짜가 있으면 그 날짜 경로로, 없으면 경로 없이 통계 창을 연다', () => {
    const { windows, h } = setup()
    h['widget:openStats']({ date: '2026-10-22' })
    h['widget:openStats']({})
    expect(windows.openSecondary.mock.calls).toEqual([
      ['stats', '/stats?date=2026-10-22'],
      ['stats', undefined],
    ])
  })

  it('widget:openStats는 잘못된 날짜를 거부한다', () => {
    const { windows, h } = setup()
    expect(() => h['widget:openStats']({ date: '2026-10-22&x=1' })).toThrow(INVALID_DATE)
    expect(windows.openSecondary).not.toHaveBeenCalled()
  })

  it('widget:openSettings는 설정 창을 연다', () => {
    const { windows, h } = setup()
    h['widget:openSettings']()
    expect(windows.openSecondary).toHaveBeenCalledWith('settings')
  })
})
