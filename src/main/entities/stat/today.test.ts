import { openDb } from '@main/shared/db'
import { describe, expect, it } from 'vitest'
import { seedFixture } from './fixture'
import { todayStats } from './today'

describe('todayStats', () => {
  it('오늘·주 합계', () => {
    const db = openDb(':memory:')
    seedFixture(db)
    expect(todayStats(db, '2026-10-22')).toMatchObject({ total: 2535, weekTotal: 2635 })
  })
})
