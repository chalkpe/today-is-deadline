import { describe, expect, it } from 'vitest'
import { openDb, SCHEMA_VERSION } from './index'

describe('openDb', () => {
  it('스키마를 만들고 user_version을 설정한다', () => {
    const db = openDb(':memory:')
    const names = (db.sqlite.prepare("select name from sqlite_master where type='table'").all() as { name: string }[]).map((r) => r.name)
    expect(names).toEqual(expect.arrayContaining(['apps', 'minute_counts', 'adjustments']))
    expect((db.sqlite.prepare('PRAGMA user_version').get() as { user_version: number }).user_version).toBe(SCHEMA_VERSION)
    db.close()
  })
})
