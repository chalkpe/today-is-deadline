import { openDb } from '@main/shared/db'
import { describe, expect, it } from 'vitest'
import { seedFixture } from './fixture'
import { appShares } from './shares'

function setup() {
  const db = openDb(':memory:')
  seedFixture(db)
  return db
}

describe('appShares', () => {
  it('앱별 합과 비율', () => {
    const s = appShares(setup(), '2026-10-22', '2026-10-22')
    expect(s.map((a) => a.appId)).toEqual(['vscode', 'slack'])
    expect(s[0]).toMatchObject({ name: 'VS Code', count: 2030 })
    expect(appShares(setup(), '2026-01-01', '2026-01-02')).toEqual([])
  })
})

describe('appShares 앱 범위', () => {
  it('범위 안 앱만 남기고 비율은 그 합 기준', () => {
    expect(appShares(setup(), '2026-10-22', '2026-10-22', ['slack'])).toEqual([{ appId: 'slack', name: 'Slack', count: 5, ratio: 1 }])
    expect(appShares(setup(), '2026-10-22', '2026-10-22', [])).toEqual([])
  })
})
