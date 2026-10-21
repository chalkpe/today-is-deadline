import { describe, expect, it, vi } from 'vitest'
import { createAlertController } from './useAlertAudio'

function fakeAudio(play: () => Promise<void> = () => Promise.resolve()) {
  const srcSets: string[] = []
  let src = ''
  const audio = {
    play: vi.fn(play),
    pause: vi.fn(),
    currentTime: 0,
    get src() {
      return src
    },
    set src(value: string) {
      srcSets.push(value)
      src = value
    },
  }
  return { audio, srcSets }
}

const ROOSTER = 'sound://builtin/rooster'
const FILE = 'sound://file/e50905da'

describe('createAlertController', () => {
  it('play는 src를 정하고 처음부터 재생한다', () => {
    const { audio, srcSets } = fakeAudio()
    createAlertController(audio).handle({ action: 'play', url: ROOSTER })
    expect(srcSets).toEqual([ROOSTER])
    expect(audio.currentTime).toBe(0)
    expect(audio.play).toHaveBeenCalledTimes(1)
  })

  it('재생 중 다시 play가 오면 currentTime을 0으로 돌리고 다시 재생한다(겹치지 않음)', () => {
    const { audio, srcSets } = fakeAudio()
    const controller = createAlertController(audio)
    controller.handle({ action: 'play', url: ROOSTER })
    audio.currentTime = 1.5 // 아직 재생 중
    controller.handle({ action: 'play', url: ROOSTER })
    expect(audio.currentTime).toBe(0)
    expect(audio.play).toHaveBeenCalledTimes(2)
    expect(srcSets).toEqual([ROOSTER]) // 같은 URL이면 다시 불러오지 않는다
  })

  it('URL이 바뀌면 src를 교체한다', () => {
    const { audio, srcSets } = fakeAudio()
    const controller = createAlertController(audio)
    controller.handle({ action: 'play', url: ROOSTER })
    controller.handle({ action: 'play', url: FILE })
    expect(srcSets).toEqual([ROOSTER, FILE])
    expect(audio.play).toHaveBeenCalledTimes(2)
  })

  it('stop은 pause만 부른다', () => {
    const { audio } = fakeAudio()
    createAlertController(audio).handle({ action: 'stop' })
    expect(audio.pause).toHaveBeenCalledTimes(1)
    expect(audio.play).not.toHaveBeenCalled()
  })

  it('play가 거부돼도(자동 재생 차단·404) 예외가 새지 않는다', async () => {
    const { audio } = fakeAudio(() => Promise.reject(new Error('NotAllowedError')))
    expect(() => createAlertController(audio).handle({ action: 'play', url: ROOSTER })).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(audio.play).toHaveBeenCalledTimes(1)
  })
})
