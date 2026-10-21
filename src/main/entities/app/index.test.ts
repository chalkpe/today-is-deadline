import { openDb } from '@main/shared/db'
import { describe, expect, it } from 'vitest'
import { getApp, normalizeApp, UNKNOWN_APP, upsertApp } from './index'

describe('normalizeApp', () => {
  it('null 또는 빈 id는 UNKNOWN_APP', () => {
    expect(normalizeApp(null)).toEqual(UNKNOWN_APP)
    expect(normalizeApp({ id: '', name: 'a', path: 'b' })).toEqual(UNKNOWN_APP)
  })
  it('빈 이름은 경로의 마지막 조각', () => {
    expect(normalizeApp({ id: 'x', name: '', path: 'C:\\a\\b.exe' }).name).toBe('b.exe')
    expect(normalizeApp({ id: 'x', name: ' ', path: '' }).name).toBe('x')
  })
})

describe('upsertApp', () => {
  it('icon은 null이 아닐 때만 덮어쓴다', () => {
    const db = openDb(':memory:')
    const app = { id: 'x', name: 'X', path: '/x' }
    upsertApp(db, app, new Uint8Array([1, 2]), '2026-10-20T00:00:00')
    upsertApp(db, { ...app, name: 'Y' }, null, '2026-10-21T00:00:00')
    const got = getApp(db, 'x')
    expect(got?.name).toBe('Y')
    expect(got?.lastSeen).toBe('2026-10-21T00:00:00')
    expect(Array.from(got?.iconPng ?? [])).toEqual([1, 2])
    expect(getApp(db, 'none')).toBeNull()
  })
})
