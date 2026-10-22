import { openDb } from '@main/shared/db'
import { describe, expect, it } from 'vitest'
import { seedFixture } from './fixture'
import { weekStats } from './week'

function setup() {
  const db = openDb(':memory:')
  seedFixture(db)
  return db
}

describe('weekStats', () => {
  it('고정 데이터', () => {
    const s = weekStats(setup(), '2026-10-19')
    expect(s).toMatchObject({ total: 2635, activeDays: 2, dailyAverage: 1318, previousTotal: 0 })
    expect(s.bestDay).toEqual({ date: '2026-10-22', total: 2535 })
    expect(s.daily).toHaveLength(7)
    expect(s.daily[3].total).toBe(2535)
    expect(s.daily[3].byApp.vscode).toBe(2030)
    expect(s.daily[0]).toEqual({ date: '2026-10-19', total: 0, byApp: {} })
    expect(s.dowHour).toHaveLength(7)
    expect(s.dowHour[3]).toHaveLength(24)
    expect(s.dowHour[3][15]).toBe(1430)
  })
})

describe('weekStats 앱 범위', () => {
  it('범위 밖 앱은 일별 조각·요일×시간 격자·합계에서 빠진다', () => {
    const s = weekStats(setup(), '2026-10-19', ['slack'])
    expect(s).toMatchObject({ total: 505, activeDays: 1, topApps: ['slack'] })
    expect(s.daily[2]).toEqual({ date: '2026-10-21', total: 0, byApp: {} })
    expect(s.daily[3]).toEqual({ date: '2026-10-22', total: 505, byApp: { slack: 5 } })
    expect(s.dowHour[3][15]).toBe(0)
    expect(s.dowHour[3][12]).toBe(5)
  })
})
