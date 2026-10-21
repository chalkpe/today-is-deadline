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
