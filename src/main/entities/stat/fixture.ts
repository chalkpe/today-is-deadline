import { upsertApp } from '@main/entities/app'
import type { Db } from '@main/shared/db'
import { addAdjustment } from './adjustments'
import { type MinuteEntry, recordMinutes } from './record'

/** 테스트 전용 고정 데이터. 2026-10-22(목)와 전날 기록, 당일 조정 +500을 채운다. */
export function seedFixture(db: Db): void {
  upsertApp(db, { id: 'vscode', name: 'VS Code', path: '' }, null, 't')
  upsertApp(db, { id: 'slack', name: 'Slack', path: '' }, null, 't')
  const d = '2026-10-22'
  const entries: MinuteEntry[] = []
  for (let m = 540; m < 600; m++) entries.push({ date: d, minute: m, appId: 'vscode', count: 10 })
  entries.push({ date: d, minute: 910, appId: 'vscode', count: 1430 })
  entries.push({ date: d, minute: 730, appId: 'slack', count: 5 })
  entries.push({ date: '2026-10-21', minute: 1, appId: 'vscode', count: 100 })
  recordMinutes(db, entries)
  addAdjustment(db, { date: d, delta: 500, memo: '' }, 't')
}
