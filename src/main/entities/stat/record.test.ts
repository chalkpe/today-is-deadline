import { upsertApp } from '@main/entities/app'
import { openDb } from '@main/shared/db'
import { describe, expect, it } from 'vitest'
import { recordMinutes } from './record'

describe('recordMinutes', () => {
  it('같은 키는 합산한다', () => {
    const db = openDb(':memory:')
    upsertApp(db, { id: 'a', name: 'A', path: '' }, null, 't')
    recordMinutes(db, [{ date: '2026-10-20', minute: 5, appId: 'a', count: 3 }])
    recordMinutes(db, [{ date: '2026-10-20', minute: 5, appId: 'a', count: 4 }])
    expect(db.sqlite.prepare('select count from minute_counts').all()).toEqual([{ count: 7 }])
  })
  it('오류 시 롤백한다', () => {
    const db = openDb(':memory:')
    upsertApp(db, { id: 'a', name: 'A', path: '' }, null, 't')
    expect(() =>
      recordMinutes(db, [
        { date: '2026-10-20', minute: 1, appId: 'a', count: 1 },
        { date: '2026-10-20', minute: 2, appId: 'missing', count: 1 },
      ]),
    ).toThrow()
    expect(db.sqlite.prepare('select count(*) as n from minute_counts').get()).toEqual({ n: 0 })
  })
})
