import { describe, expect, it, vi } from 'vitest'
import { buildTrayMenu, type TrayActions } from './menu'

const makeActions = () => ({
  toggleCounting: vi.fn(),
  toggleAlert: vi.fn(),
  toggleWidget: vi.fn(),
  toggleLock: vi.fn(),
  openStats: vi.fn(),
  openAdjust: vi.fn(),
  openSettings: vi.fn(),
  quit: vi.fn(),
})

describe('buildTrayMenu', () => {
  const state = { counting: true, alert: false, widgetVisible: true, locked: false }

  it('라벨 순서와 구분선', () => {
    const items = buildTrayMenu(state, makeActions())
    expect(items.map((i) => (i.type === 'separator' ? '-' : i.label))).toEqual([
      '카운트',
      '알림',
      '위젯 표시',
      '위치 잠금',
      '-',
      '통계…',
      '가감…',
      '설정…',
      '-',
      '종료',
    ])
  })

  it('앞의 넷은 checkbox이고 상태를 반영한다', () => {
    const items = buildTrayMenu(state, makeActions())
    expect(items.slice(0, 4).map((i) => [i.type, i.checked])).toEqual([
      ['checkbox', true],
      ['checkbox', false],
      ['checkbox', true],
      ['checkbox', false],
    ])
  })

  it('click은 대응하는 action을 인자 없이 호출한다', () => {
    const actions = makeActions()
    const items = buildTrayMenu(state, actions)
    const order: (keyof TrayActions)[] = [
      'toggleCounting',
      'toggleAlert',
      'toggleWidget',
      'toggleLock',
      'openStats',
      'openAdjust',
      'openSettings',
      'quit',
    ]
    const clickable = items.filter((i) => i.type !== 'separator')
    clickable.forEach((item, idx) => {
      ;(item.click as () => void)()
      expect(actions[order[idx]]).toHaveBeenCalledWith()
    })
  })
})
