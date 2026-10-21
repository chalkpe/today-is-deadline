import { openDb } from '@main/shared/db'
import { describe, expect, it } from 'vitest'
import { addAdjustment, listAdjustments, removeAdjustment } from './adjustments'

describe('adjustments 검증', () => {
  it('0과 정수가 아닌 delta를 거부한다', () => {
    const db = openDb(':memory:')
    expect(() => addAdjustment(db, { date: '2026-10-20', delta: 0, memo: '' }, 't')).toThrow('0이 아닌 정수')
    expect(() => addAdjustment(db, { date: '2026-10-20', delta: 1.5, memo: '' }, 't')).toThrow('0이 아닌 정수')
    expect(listAdjustments(db)).toEqual([])
  })
  it('DB도 delta 0을 막고 memo 기본값은 빈 문자열', () => {
    const db = openDb(':memory:')
    expect(() => db.sqlite.prepare("INSERT INTO adjustments (date, delta, created_at) VALUES ('2026-10-20', 0, 't')").run()).toThrow()
    db.sqlite.prepare("INSERT INTO adjustments (date, delta, created_at) VALUES ('2026-10-20', 3, 't')").run()
    expect(listAdjustments(db)[0].memo).toBe('')
  })
})

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
