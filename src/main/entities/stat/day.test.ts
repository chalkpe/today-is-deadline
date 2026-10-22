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

describe('dayStats 앱 범위', () => {
  it('범위 밖 앱은 합계·시간대·활동 분·전날 합계에서 빠지고 조정은 남는다', () => {
    const s = dayStats(setup(), '2026-10-22', ['slack'])
    expect(s).toMatchObject({ total: 505, adjustment: 500, previousTotal: 0, activeMinutes: 1 })
    expect(s.peakHour).toEqual({ hour: 12, count: 5 })
    expect(s.hourly[9]).toEqual({ hour: 9, total: 0, byApp: {} })
    expect(s.strip[73]).toBe(5)
    expect(s.apps).toEqual([{ appId: 'slack', name: 'Slack', count: 5, ratio: 1 }])
    expect(s.topApps).toEqual(['slack'])
  })
})
