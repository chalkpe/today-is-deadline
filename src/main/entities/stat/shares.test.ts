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
