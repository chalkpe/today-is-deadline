import { describe, expect, it, vi } from 'vitest'
import { createElectronApi } from './preload'

const makeFake = () => ({
  invoke: vi.fn(async (_channel: string, ..._args: unknown[]) => 'result' as unknown),
  on: vi.fn(),
  removeListener: vi.fn(),
})

describe('createElectronApi', () => {
  it('invoke는 채널과 인자를 그대로 전달하고 응답을 돌려준다', async () => {
    const fake = makeFake()
    const api = createElectronApi(fake)
    await expect(api.invoke('stats:day', '2026-10-22')).resolves.toBe('result')
    expect(fake.invoke).toHaveBeenCalledWith('stats:day', '2026-10-22')
  })

  it('args가 없는 채널은 인자 없이 호출한다', async () => {
    const fake = makeFake()
    await createElectronApi(fake).invoke('settings:get')
    expect(fake.invoke).toHaveBeenCalledWith('settings:get')
  })

  it('호출 타입: 인자 없는 채널은 0개, 나머지는 정확히 1개', () => {
    const api = createElectronApi(makeFake())
    const never = () => {
      // @ts-expect-error 인자 없는 채널에 인자를 넘기면 거부된다
      api.invoke('settings:get', 1)
      // @ts-expect-error 인자가 필요한 채널은 인자 없이 호출할 수 없다
      api.invoke('stats:day')
    }
    expect(never).toBeTypeOf('function')
  })

  it('리스너는 payload(두 번째 인자)만 받는다', () => {
    const fake = makeFake()
    const listener = vi.fn()
    createElectronApi(fake).on('push:counting', listener)
    const wrapper = fake.on.mock.calls[0][1] as (e: unknown, p: unknown) => void
    wrapper({ sender: 1 }, true)
    expect(listener).toHaveBeenCalledWith(true)
    expect(listener.mock.calls[0]).toHaveLength(1)
  })

  it('해제 함수는 등록한 래퍼와 같은 참조로 removeListener를 호출한다', () => {
    const fake = makeFake()
    const off = createElectronApi(fake).on('push:counting', vi.fn())
    off()
    expect(fake.removeListener).toHaveBeenCalledWith('push:counting', fake.on.mock.calls[0][1])
  })
})
