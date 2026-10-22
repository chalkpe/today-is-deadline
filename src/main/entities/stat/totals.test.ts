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

describe('앱 범위', () => {
  const scoped = () => {
    const db = setup()
    recordMinutes(db, [
      { date: '2026-10-21', minute: 5, appId: 'a', count: 70 },
      { date: '2026-10-21', minute: 6, appId: 'b', count: 30 },
    ])
    return db
  }

  it('dayTotals는 범위 안 앱의 타수만 더하고 조정은 앱과 무관하게 더한다', () => {
    const range = ['2026-10-21', '2026-10-21'] as const
    expect(dayTotals(scoped(), ...range, null)).toEqual([{ date: '2026-10-21', total: 150 }])
    expect(dayTotals(scoped(), ...range, ['b'])).toEqual([{ date: '2026-10-21', total: 80 }])
    expect(dayTotals(scoped(), ...range, [])).toEqual([{ date: '2026-10-21', total: 50 }])
  })

  it('dayDetail은 범위 안 앱만 나열하고 비율도 그 안에서 계산한다', () => {
    expect(dayDetail(scoped(), '2026-10-21', ['a', '없는 앱'])).toEqual({
      date: '2026-10-21',
      total: 120,
      adjustment: 50,
      apps: [{ appId: 'a', name: 'A', count: 70, ratio: 1 }],
    })
  })
})
