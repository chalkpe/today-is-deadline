import { upsertApp } from '@main/entities/app'
import { recordMinutes } from '@main/entities/stat'
import { openDb } from '@main/shared/db'
import { INVALID_DATE } from '@main/shared/ipc'
import { addDays } from '@shared/model/calendar'
import { describe, expect, it } from 'vitest'
import { statsHandlers } from './ipc'

const NOW = new Date(2026, 9, 22, 15, 0) // 2026-10-22(목)

function setup() {
  const db = openDb(':memory:')
  upsertApp(db, { id: 'vscode', name: 'VS Code', path: '' }, null, 't')
  upsertApp(db, { id: 'slack', name: 'Slack', path: '' }, new Uint8Array([1, 2, 3]), 't')
  recordMinutes(db, [
    { date: '2026-10-22', minute: 600, appId: 'vscode', count: 30 },
    { date: '2026-10-21', minute: 600, appId: 'slack', count: 5 },
  ])
  return statsHandlers({ db, now: () => NOW })
}

describe('statsHandlers', () => {
  it('heatmap:range는 범위의 날짜별 합계를 돌려준다', () => {
    const h = setup()
    expect(h['heatmap:range']({ start: '2026-10-21', end: '2026-10-22' })).toEqual([
      { date: '2026-10-21', total: 5 },
      { date: '2026-10-22', total: 30 },
    ])
  })

  it('heatmap:range는 잘못된 날짜·뒤집힌 범위·400일 초과를 거부한다', () => {
    const h = setup()
    const end = '2026-10-22'
    expect(h['heatmap:range']({ start: addDays(end, -399), end })).toHaveLength(400)
    expect(() => h['heatmap:range']({ start: addDays(end, -400), end })).toThrow(INVALID_DATE)
    expect(() => h['heatmap:range']({ start: end, end: '2026-10-21' })).toThrow(INVALID_DATE)
    expect(() => h['heatmap:range']({ start: '2026-10-xx', end })).toThrow(INVALID_DATE)
  })

  it('day:detail·stats:day·stats:week·stats:month는 잘못된 날짜를 거부한다', () => {
    const h = setup()
    expect(() => h['day:detail']('2026-02-30')).toThrow(INVALID_DATE)
    expect(() => h['stats:day']('어제')).toThrow(INVALID_DATE)
    expect(() => h['stats:week']('')).toThrow(INVALID_DATE)
    expect(() => h['stats:month']('2026-13')).toThrow(INVALID_DATE)
  })

  it('stats:week는 아무 요일이나 받아 그 주 월요일로 맞춘다', () => {
    const h = setup()
    const week = h['stats:week']('2026-10-22')
    expect(week).toMatchObject({ start: '2026-10-19', end: '2026-10-25', total: 35 })
    expect(week.daily[3].byApp).toEqual({ vscode: 30 })
  })

  it('stats:today와 stats:month는 now의 로컬 날짜를 오늘로 쓴다', () => {
    const h = setup()
    expect(h['stats:today']()).toMatchObject({ date: '2026-10-22', total: 30, weekTotal: 35 })
    expect(h['stats:month']('2026-10')).toMatchObject({ month: '2026-10', total: 35, elapsedDays: 22 })
  })

  it('stats:day·day:detail은 그날 값을 돌려준다', () => {
    const h = setup()
    expect(h['stats:day']('2026-10-21')).toMatchObject({ date: '2026-10-21', total: 5 })
    expect(h['day:detail']('2026-10-22')).toMatchObject({ date: '2026-10-22', total: 30, adjustment: 0 })
  })

  it('app:icon은 저장된 PNG를 data URL로, 없으면 null', () => {
    const h = setup()
    expect(h['app:icon']('slack')).toBe('data:image/png;base64,AQID')
    expect(h['app:icon']('vscode')).toBeNull()
    expect(h['app:icon']('없는 앱')).toBeNull()
    expect(h['app:icon'](42 as unknown as string)).toBeNull()
  })
})
