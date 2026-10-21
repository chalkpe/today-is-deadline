import { describe, expect, it, vi } from 'vitest'
import { type Handlers, registerHandlers } from './handlers'

describe('registerHandlers', () => {
  it('채널마다 한 번 등록하고 (args, event)를 핸들러에 넘겨 결과를 돌려준다', async () => {
    const ipc = { handle: vi.fn() }
    const day = vi.fn((date: string) => ({ date }))
    const get = vi.fn(() => 'settings')
    registerHandlers(ipc, { 'stats:day': day, 'settings:get': get } as unknown as Handlers)

    expect(ipc.handle.mock.calls.map((c) => c[0])).toEqual(['stats:day', 'settings:get'])
    const event = { sender: {} }
    const listener = ipc.handle.mock.calls[0][1]
    await expect(Promise.resolve(listener(event, '2026-10-22'))).resolves.toEqual({ date: '2026-10-22' })
    expect(day).toHaveBeenCalledWith('2026-10-22', event)
  })
})
