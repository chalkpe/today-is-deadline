import type { Db } from '@main/shared/db'
import type { AppIdentity } from '@main/shared/native'

export const UNKNOWN_APP: AppIdentity = { id: 'unknown', name: '알 수 없음', path: '' }

/** 앱 식별자를 정리한다. 식별 불가면 UNKNOWN_APP, 이름이 비면 경로의 마지막 조각(없으면 id). */
export function normalizeApp(app: AppIdentity | null): AppIdentity {
  const id = app?.id.trim() ?? ''
  if (!app || id === '') return UNKNOWN_APP
  const path = app.path.trim()
  const name = app.name.trim() || (path.split(/[/\\]/).pop() ?? '') || id
  return { id, name, path }
}

export function upsertApp(db: Db, app: AppIdentity, iconPng: Uint8Array | null, seenAt: string): void {
  db.sqlite
    .prepare(
      `INSERT INTO apps (id, name, path, icon_png, last_seen) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         path = excluded.path,
         icon_png = COALESCE(excluded.icon_png, apps.icon_png),
         last_seen = excluded.last_seen`,
    )
    .run(app.id, app.name, app.path, iconPng, seenAt)
}

export function getApp(
  db: Db,
  id: string,
): { id: string; name: string; path: string; iconPng: Uint8Array | null; lastSeen: string } | null {
  const row = db.sqlite.prepare('SELECT id, name, path, icon_png, last_seen FROM apps WHERE id = ?').get(id) as
    | { id: string; name: string; path: string; icon_png: Uint8Array | null; last_seen: string }
    | undefined
  if (!row) return null
  return { id: row.id, name: row.name, path: row.path, iconPng: row.icon_png, lastSeen: row.last_seen }
}
