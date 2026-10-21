import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_SETTINGS, normalizeSettings, SETTINGS_ERRORS, type Settings, validateSettings } from '@shared/model/settings'

export type SettingsStore = {
  get(): Settings
  /** 검증 오류가 있으면 저장하지 않고 오류를 반환한다. */
  set(next: Settings): string[]
  /** 검증 없이 내부 변경(창 위치 등)에 사용하며, 저장하고 통지한다. */
  update(patch: (current: Settings) => Settings): void
  onChange(listener: (next: Settings, prev: Settings) => void): () => void
}

type Deps = { filePath: string; fileExists: (p: string) => boolean }

export function createSettingsStore({ filePath, fileExists }: Deps): SettingsStore {
  const listeners = new Set<(next: Settings, prev: Settings) => void>()

  const hasMissingSound = (s: Settings) => s.alert.sound.kind === 'file' && !fileExists(s.alert.sound.path)

  const write = (value: Settings) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    const tmp = `${filePath}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2))
    fs.renameSync(tmp, filePath)
  }

  const load = (): Settings => {
    let raw: unknown
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch {
      raw = undefined
    }
    // 정규화 결과가 기본값 하위 객체를 참조할 수 있으므로 복제해 DEFAULT_SETTINGS 공유를 막는다.
    const loaded = structuredClone(normalizeSettings(raw))
    if (!hasMissingSound(loaded)) return loaded
    const fixed: Settings = { ...loaded, alert: { ...loaded.alert, sound: structuredClone(DEFAULT_SETTINGS.alert.sound) } }
    write(fixed)
    return fixed
  }

  let current = load()

  const commit = (next: Settings) => {
    write(next)
    const prev = current
    current = next
    for (const listener of [...listeners]) {
      try {
        listener(next, prev)
      } catch {
        // 리스너 예외는 저장소 동작에 영향을 주지 않는다.
      }
    }
  }

  return {
    get: () => current,
    set(next) {
      const errors = validateSettings(next)
      if (hasMissingSound(next)) errors.push(SETTINGS_ERRORS.soundFile)
      if (errors.length > 0) return errors
      commit(next)
      return []
    },
    update(patch) {
      commit(patch(current))
    },
    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
