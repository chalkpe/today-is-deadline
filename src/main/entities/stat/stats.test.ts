import { upsertApp } from '@main/entities/app'
import { openDb } from '@main/shared/db'
import { describe, expect, it } from 'vitest'
import { addAdjustment } from './adjustments'
import { dayStats } from './day'
import { monthStats } from './month'
import { type MinuteEntry, recordMinutes } from './record'
import { appShares } from './shares'
import { todayStats } from './today'
import { weekStats } from './week'

function setup() {
  const db = openDb(':memory:')
  upsertApp(db, { id: 'vscode', name: 'VS Code', path: '' }, null, 't')
  upsertApp(db, { id: 'slack', name: 'Slack', path: '' }, null, 't')
  const d = '2026-10-22'
  const entries: MinuteEntry[] = []
  for (let m = 540; m < 600; m++) entries.push({ date: d, minute: m, appId: 'vscode', count: 10 })
  entries.push({ date: d, minute: 910, appId: 'vscode', count: 1430 })
  entries.push({ date: d, minute: 730, appId: 'slack', count: 5 })
  entries.push({ date: '2026-10-21', minute: 1, appId: 'vscode', count: 100 })
  recordMinutes(db, entries)
  addAdjustment(db, { date: d, delta: 500, memo: '' }, 't')
  return db
}

describe('통계 집계', () => {
  it('appShares', () => {
    const s = appShares(setup(), '2026-10-22', '2026-10-22')
    expect(s.map((a) => a.appId)).toEqual(['vscode', 'slack'])
    expect(s[0]).toMatchObject({ name: 'VS Code', count: 2030 })
    expect(appShares(setup(), '2026-01-01', '2026-01-02')).toEqual([])
  })
  it('dayStats', () => {
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
  it('dayStats 빈 날', () => {
    const s = dayStats(setup(), '2026-01-01')
    expect(s).toMatchObject({ total: 0, peakHour: null, longestGap: null, activeMinutes: 0 })
  })
  it('weekStats', () => {
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
  it('monthStats', () => {
    const s = monthStats(setup(), '2026-10', '2026-10-22')
    expect(s).toMatchObject({ total: 2635, elapsedDays: 22, activeDays: 2, dailyAverage: 1318, previousTotal: 0 })
    expect(s.days).toHaveLength(31)
    expect(monthStats(setup(), '2026-11', '2026-10-22').elapsedDays).toBe(0)
  })
  it('todayStats', () => {
    expect(todayStats(setup(), '2026-10-22')).toMatchObject({ total: 2535, weekTotal: 2635 })
  })
})
