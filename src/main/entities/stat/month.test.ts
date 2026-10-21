import { openDb } from '@main/shared/db'
import { describe, expect, it } from 'vitest'
import { seedFixture } from './fixture'
import { monthStats } from './month'

function setup() {
  const db = openDb(':memory:')
  seedFixture(db)
  return db
}

describe('monthStats', () => {
  it('고정 데이터', () => {
    const s = monthStats(setup(), '2026-10', '2026-10-22')
    expect(s).toMatchObject({ total: 2635, elapsedDays: 22, activeDays: 2, dailyAverage: 1318, previousTotal: 0 })
    expect(s.days).toHaveLength(31)
  })
  it('아직 오지 않은 달은 경과일 0', () => {
    expect(monthStats(setup(), '2026-11', '2026-10-22').elapsedDays).toBe(0)
  })
})
