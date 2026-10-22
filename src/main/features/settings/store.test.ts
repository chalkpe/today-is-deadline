import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DEFAULT_SETTINGS, SETTINGS_ERRORS } from '@shared/model/settings'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSettingsStore } from './store'

let dir: string
let file: string
const exists = (p: string) => fs.existsSync(p)

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-store-'))
  file = path.join(dir, 'settings.json')
})
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

const make = () => createSettingsStore({ filePath: file, fileExists: exists })

describe('createSettingsStore', () => {
  it('파일이 없으면 기본값', () => {
    const s = make().get()
    expect(s).toEqual(DEFAULT_SETTINGS)
    expect(s).not.toBe(DEFAULT_SETTINGS)
    expect(s.widget).not.toBe(DEFAULT_SETTINGS.widget)
  })

  it('일부만 있는 파일은 x·y를 보존하고 나머지는 기본값', () => {
    fs.writeFileSync(file, JSON.stringify({ widget: { x: 10, y: 20 } }))
    const s = make().get()
    expect(s.widget.x).toBe(10)
    expect(s.widget.y).toBe(20)
    expect(s.alert).toEqual(DEFAULT_SETTINGS.alert)
  })

  it('손으로 고친 파일의 범위 밖 대기 시간·반복 간격·임계값은 기본값으로 읽는다', () => {
    fs.writeFileSync(
      file,
      JSON.stringify({ alert: { idleSeconds: 0.001, repeatSeconds: 1e9 }, heatmap: { fixedThresholds: [4, 3, 2, 1] }, widget: { x: 7 } }),
    )
    const s = make().get()
    expect(s.alert.idleSeconds).toBe(DEFAULT_SETTINGS.alert.idleSeconds)
    expect(s.alert.repeatSeconds).toBe(DEFAULT_SETTINGS.alert.repeatSeconds)
    expect(s.heatmap.fixedThresholds).toEqual(DEFAULT_SETTINGS.heatmap.fixedThresholds)
    expect(s.widget.x).toBe(7)
  })

  it('깨진 JSON은 기본값', () => {
    fs.writeFileSync(file, '{ not json')
    expect(make().get()).toEqual(DEFAULT_SETTINGS)
  })

  it('존재하지 않는 소리 파일은 내장음으로 되돌리고 저장한다', () => {
    const missing = path.join(dir, 'nope.mp3')
    fs.writeFileSync(file, JSON.stringify({ alert: { sound: { kind: 'file', path: missing } } }))
    expect(make().get().alert.sound).toEqual({ kind: 'builtin', name: 'rooster' })
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).alert.sound).toEqual({ kind: 'builtin', name: 'rooster' })
  })

  it('잘못된 set은 오류를 반환하고 파일을 바꾸지 않는다', () => {
    const store = make()
    store.update((c) => c)
    const before = fs.readFileSync(file, 'utf8')
    const listener = vi.fn()
    store.onChange(listener)
    const cur = store.get()
    const errors = store.set({ ...cur, alert: { ...cur.alert, idleSeconds: 5 } })
    expect(errors).toEqual([SETTINGS_ERRORS.idle])
    expect(fs.readFileSync(file, 'utf8')).toBe(before)
    expect(listener).not.toHaveBeenCalled()
    expect(store.get()).toBe(cur)
  })

  it('없는 소리 파일 set은 soundFile 오류', () => {
    const store = make()
    const cur = store.get()
    const errors = store.set({ ...cur, alert: { ...cur.alert, sound: { kind: 'file', path: path.join(dir, 'x.mp3') } } })
    expect(errors).toEqual([SETTINGS_ERRORS.soundFile])
  })

  it('저장된 소리 파일이 그사이 지워져도 소리를 바꾸지 않는 set은 저장한다', () => {
    const sound = path.join(dir, 'a.mp3')
    fs.writeFileSync(sound, '')
    fs.writeFileSync(file, JSON.stringify({ alert: { sound: { kind: 'file', path: sound } } }))
    const store = make()
    fs.rmSync(sound)
    const cur = store.get()
    expect(store.set({ ...cur, widget: { ...cur.widget, locked: true } })).toEqual([])
    expect(store.get().widget.locked).toBe(true)
  })

  it('시작 때 고친 소리 설정을 저장하지 못해도 고친 값으로 읽는다', () => {
    fs.writeFileSync(file, JSON.stringify({ alert: { sound: { kind: 'file', path: path.join(dir, 'nope.mp3') } } }))
    const rename = vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw new Error('EPERM')
    })
    try {
      expect(make().get().alert.sound).toEqual({ kind: 'builtin', name: 'rooster' })
    } finally {
      rename.mockRestore()
    }
  })

  it('set 성공 시 (next, prev)로 통지하고 저장한다', () => {
    const store = make()
    const prev = store.get()
    const listener = vi.fn()
    store.onChange(listener)
    const next = { ...prev, counting: { enabled: false } }
    expect(store.set(next)).toEqual([])
    expect(listener).toHaveBeenCalledWith(next, prev)
    expect(store.get()).toBe(next)
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).counting.enabled).toBe(false)
    expect(fs.existsSync(`${file}.tmp`)).toBe(false)
  })

  it('update는 파일에 반영하고 통지하며 DEFAULT_SETTINGS를 바꾸지 않는다', () => {
    const store = make()
    const listener = vi.fn()
    const unsub = store.onChange(listener)
    store.update((c) => ({ ...c, widget: { ...c.widget, x: 5 } }))
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).widget.x).toBe(5)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(DEFAULT_SETTINGS.widget.x).toBeNull()
    unsub()
    store.update((c) => c)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('리스너 예외는 저장소를 깨지 않는다', () => {
    const store = make()
    store.onChange(() => {
      throw new Error('boom')
    })
    expect(() => store.update((c) => ({ ...c, general: { ...c.general, openAtLogin: true } }))).not.toThrow()
    expect(store.get().general.openAtLogin).toBe(true)
  })

  it('상위 디렉터리가 없어도 저장한다', () => {
    file = path.join(dir, 'a', 'b', 'settings.json')
    make().update((c) => c)
    expect(fs.existsSync(file)).toBe(true)
  })
})
