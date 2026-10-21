import { DatabaseSync } from 'node:sqlite'

export type Db = { sqlite: DatabaseSync; close(): void }

export const SCHEMA_VERSION = 1

const SCHEMA_V1 = `
CREATE TABLE apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  icon_png BLOB,
  last_seen TEXT NOT NULL
);
CREATE TABLE minute_counts (
  date TEXT NOT NULL,
  minute INTEGER NOT NULL,
  app_id TEXT NOT NULL REFERENCES apps(id),
  count INTEGER NOT NULL,
  PRIMARY KEY (date, minute, app_id)
);
CREATE INDEX minute_counts_date ON minute_counts(date);
CREATE TABLE adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  delta INTEGER NOT NULL CHECK (delta <> 0),
  memo TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
`

/** DB를 열고 필요하면 스키마를 만든다. 파일 DB는 WAL 모드를 쓴다. */
export function openDb(path: string): Db {
  const sqlite = new DatabaseSync(path)
  if (path !== ':memory:') sqlite.exec('PRAGMA journal_mode = WAL')
  sqlite.exec('PRAGMA foreign_keys = ON')
  const row = sqlite.prepare('PRAGMA user_version').get() as { user_version: number }
  if (row.user_version === 0) {
    sqlite.exec('BEGIN')
    try {
      sqlite.exec(SCHEMA_V1)
      sqlite.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`)
      sqlite.exec('COMMIT')
    } catch (error) {
      sqlite.exec('ROLLBACK')
      throw error
    }
  }
  return { sqlite, close: () => sqlite.close() }
}
