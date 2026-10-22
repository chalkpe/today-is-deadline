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

describe('todayStats 앱 범위', () => {
  it('오늘·주 합계와 앱 목록에 범위를 적용한다', () => {
    const db = openDb(':memory:')
    seedFixture(db)
    expect(todayStats(db, '2026-10-22', ['slack'])).toEqual({
      date: '2026-10-22',
      total: 505,
      weekTotal: 505,
      apps: [{ appId: 'slack', name: 'Slack', count: 5, ratio: 1 }],
    })
  })
})
