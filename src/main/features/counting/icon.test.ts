import { describe, expect, it, vi } from 'vitest'
import { firstIconPng, iconStrategies } from './icon'

describe('iconStrategies', () => {
  it('macOS는 썸네일을 먼저, 실패하면 파일 아이콘', () => {
    expect(iconStrategies('darwin')).toEqual(['thumbnail', 'fileIcon'])
  })

  it('Windows는 파일 아이콘만', () => {
    expect(iconStrategies('win32')).toEqual(['fileIcon'])
  })
})

describe('firstIconPng', () => {
  const png = new Uint8Array([1, 2, 3])
  const other = new Uint8Array([9])

  it('앞 전략이 성공하면 그 결과를 쓰고 뒤 전략은 부르지 않는다', async () => {
    const loaders = { thumbnail: vi.fn(async () => png), fileIcon: vi.fn(async () => other) }
    await expect(firstIconPng('/Applications/A.app', ['thumbnail', 'fileIcon'], loaders)).resolves.toBe(png)
    expect(loaders.thumbnail).toHaveBeenCalledWith('/Applications/A.app')
    expect(loaders.fileIcon).not.toHaveBeenCalled()
  })

  it.each([
    ['거부', async () => Promise.reject(new Error('QuickLook 실패'))],
    ['null', async () => null],
    ['빈 PNG', async () => new Uint8Array()],
    [
      '동기 throw',
      () => {
        throw new Error('동기 실패')
      },
    ],
  ])('앞 전략이 %s이면 다음 전략으로 넘어간다', async (_name, thumbnail) => {
    const loaders = { thumbnail: thumbnail as () => Promise<Uint8Array | null>, fileIcon: vi.fn(async () => other) }
    await expect(firstIconPng('/x', ['thumbnail', 'fileIcon'], loaders)).resolves.toBe(other)
  })

  it('모두 실패하면 null', async () => {
    const loaders = { thumbnail: async () => null, fileIcon: async () => Promise.reject(new Error('x')) }
    await expect(firstIconPng('/x', ['thumbnail', 'fileIcon'], loaders)).resolves.toBeNull()
  })

  it('전략 목록에 없는 로더는 부르지 않는다', async () => {
    const loaders = { thumbnail: vi.fn(async () => png), fileIcon: vi.fn(async () => other) }
    await expect(firstIconPng('C:\\a.exe', ['fileIcon'], loaders)).resolves.toBe(other)
    expect(loaders.thumbnail).not.toHaveBeenCalled()
  })
})
