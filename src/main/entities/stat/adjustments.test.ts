import { openDb } from '@main/shared/db'
import { describe, expect, it } from 'vitest'
import { addAdjustment, listAdjustments, removeAdjustment } from './adjustments'

describe('adjustments', () => {
  it('추가, 최신순 조회, 삭제', () => {
    const db = openDb(':memory:')
    const a = addAdjustment(db, { date: '2026-10-20', delta: 5, memo: 'a' }, '2026-10-20T01:00:00')
    const b = addAdjustment(db, { date: '2026-10-20', delta: -2, memo: 'b' }, '2026-10-20T02:00:00')
    expect(listAdjustments(db)).toEqual([b, a])
    expect(a).toMatchObject({ date: '2026-10-20', delta: 5, memo: 'a', createdAt: '2026-10-20T01:00:00' })
    removeAdjustment(db, a.id)
    removeAdjustment(db, 999)
    expect(listAdjustments(db)).toEqual([b])
    removeAdjustment(db, b.id)
    expect(listAdjustments(db)).toEqual([])
  })
})
