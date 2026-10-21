import { upsertApp } from '@main/entities/app'
import { openDb } from '@main/shared/db'
import { describe, expect, it } from 'vitest'
import { addAdjustment } from './adjustments'
import { recordMinutes } from './record'
import { dayDetail, dayTotals } from './totals'

function setup() {
  const db = openDb(':memory:')
  upsertApp(db, { id: 'a', name: 'A', path: '' }, null, 't')
  upsertApp(db, { id: 'b', name: 'B', path: '' }, null, 't')
  recordMinutes(db, [
    { date: '2026-10-20', minute: 1, appId: 'a', count: 300 },
    { date: '2026-10-20', minute: 2, appId: 'b', count: 200 },
  ])
  addAdjustment(db, { date: '2026-10-21', delta: 50, memo: '' }, 't1')
  addAdjustment(db, { date: '2026-10-20', delta: -600, memo: '' }, 't2')
  return db
}

describe('dayTotals', () => {
  it('범위의 모든 날을 조정 포함, 음수는 0으로', () => {
    expect(dayTotals(setup(), '2026-10-20', '2026-10-22')).toEqual([
      { date: '2026-10-20', total: 0 },
      { date: '2026-10-21', total: 50 },
      { date: '2026-10-22', total: 0 },
    ])
  })
})

describe('dayDetail', () => {
  it('앱 비율은 원본합 기준', () => {
    const d = dayDetail(setup(), '2026-10-20')
    expect(d.total).toBe(0)
    expect(d.adjustment).toBe(-600)
    expect(d.apps[0]).toEqual({ appId: 'a', name: 'A', count: 300, ratio: 0.6 })
    expect(d.apps[1].appId).toBe('b')
  })
  it('기록이 없으면 빈 목록', () => {
    expect(dayDetail(setup(), '2026-10-22')).toEqual({ date: '2026-10-22', total: 0, adjustment: 0, apps: [] })
  })
})
