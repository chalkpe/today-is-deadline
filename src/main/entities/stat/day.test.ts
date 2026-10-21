import { openDb } from '@main/shared/db'
import { describe, expect, it } from 'vitest'
import { dayStats } from './day'
import { seedFixture } from './fixture'

function setup() {
  const db = openDb(':memory:')
  seedFixture(db)
  return db
}

describe('dayStats', () => {
  it('고정 데이터', () => {
    const s = dayStats(setup(), '2026-10-22')
    expect(s).toMatchObject({ total: 2535, adjustment: 500, previousTotal: 100, activeMinutes: 62 })
    expect(s.peakHour).toEqual({ hour: 15, count: 1430 })
    expect(s.longestGap).toEqual({ minutes: 180, from: 730, to: 910 })
    expect(s.hourly).toHaveLength(24)
    expect(s.hourly[9].total).toBe(600)
    expect(s.hourly[9].byApp.vscode).toBe(600)
    expect(s.hourly[0].byApp).toEqual({})
    expect(s.strip).toHaveLength(144)
    expect(s.strip[91]).toBe(1430)
    expect(s.apps[0].appId).toBe('vscode')
    expect(s.apps[0].ratio).toBe(2030 / 2035)
    expect(s.topApps).toEqual(['vscode', 'slack'])
  })
  it('빈 날', () => {
    const s = dayStats(setup(), '2026-01-01')
    expect(s).toMatchObject({ total: 0, peakHour: null, longestGap: null, activeMinutes: 0 })
  })
})
