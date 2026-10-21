import type { FixedThresholds } from './intensity'

export type HeatmapMode = 'relative' | 'fixed'
export type BuiltinSoundName = 'rooster' | 'dog-barking' | 'fire-alarm'
export const BUILTIN_SOUNDS: readonly BuiltinSoundName[] = ['rooster', 'dog-barking', 'fire-alarm']
export type SoundSetting = { kind: 'builtin'; name: BuiltinSoundName } | { kind: 'file'; path: string }

export type Settings = {
  counting: { enabled: boolean }
  heatmap: {
    baseColor: string
    mode: HeatmapMode
    fixedThresholds: FixedThresholds
    showTodayCount: boolean
    showMonthLabels: boolean
    showDayLabels: boolean
    showIcons: boolean
  }
  alert: { enabled: boolean; idleSeconds: number; repeatSeconds: number; sound: SoundSetting }
  widget: { x: number | null; y: number | null; width: number; locked: boolean; visible: boolean; displayId: number | null }
  stats: { width: number; height: number }
  general: { openAtLogin: boolean }
}

// MIN_WEEKS(8)×PITCH(12) + PANEL_PADDING×2 + DOW_LABEL_WIDTH = 132 이상
export const WIDGET_MIN_WIDTH = 140

export const DEFAULT_SETTINGS: Settings = {
  counting: { enabled: true },
  heatmap: {
    baseColor: '#39d353',
    mode: 'relative',
    fixedThresholds: [1000, 2000, 3000, 4000],
    showTodayCount: true,
    showMonthLabels: true,
    showDayLabels: false,
    showIcons: true,
  },
  alert: { enabled: true, idleSeconds: 300, repeatSeconds: 60, sound: { kind: 'builtin', name: 'rooster' } },
  widget: { x: null, y: null, width: 320, locked: false, visible: true, displayId: null },
  stats: { width: 760, height: 640 },
  general: { openAtLogin: false },
}

export const SETTINGS_ERRORS = {
  thresholds: '임계값은 양의 정수 4개가 오름차순이어야 합니다',
  idle: '대기 시간은 10초 이상이어야 합니다',
  repeat: '반복 간격은 10초 이상이어야 합니다',
  soundFile: '소리 파일을 찾을 수 없습니다',
} as const

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const section = (v: unknown): Obj => (isObj(v) ? v : {})
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d)
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const nullableNum = (v: unknown, d: number | null) =>
  v === null || (typeof v === 'number' && Number.isFinite(v)) ? (v as number | null) : d

const isThresholds = (v: unknown): v is FixedThresholds =>
  Array.isArray(v) && v.length === 4 && v.every((n) => Number.isInteger(n) && n > 0)

function sound(v: unknown, d: SoundSetting): SoundSetting {
  if (!isObj(v)) return d
  if (v.kind === 'builtin' && BUILTIN_SOUNDS.includes(v.name as BuiltinSoundName))
    return { kind: 'builtin', name: v.name as BuiltinSoundName }
  if (v.kind === 'file' && typeof v.path === 'string' && v.path !== '') return { kind: 'file', path: v.path }
  return d
}

/** 어떤 입력이든 던지지 않고, 잘못된 필드만 기본값으로 바꾼다. */
export function normalizeSettings(input: unknown): Settings {
  const d = DEFAULT_SETTINGS
  const root = section(input)
  const heatmap = section(root.heatmap)
  const alert = section(root.alert)
  const widget = section(root.widget)
  const stats = section(root.stats)
  return {
    counting: { enabled: bool(section(root.counting).enabled, d.counting.enabled) },
    heatmap: {
      baseColor: str(heatmap.baseColor, d.heatmap.baseColor),
      mode: heatmap.mode === 'relative' || heatmap.mode === 'fixed' ? heatmap.mode : d.heatmap.mode,
      fixedThresholds: isThresholds(heatmap.fixedThresholds)
        ? ([...heatmap.fixedThresholds] as unknown as FixedThresholds)
        : d.heatmap.fixedThresholds,
      showTodayCount: bool(heatmap.showTodayCount, d.heatmap.showTodayCount),
      showMonthLabels: bool(heatmap.showMonthLabels, d.heatmap.showMonthLabels),
      showDayLabels: bool(heatmap.showDayLabels, d.heatmap.showDayLabels),
      showIcons: bool(heatmap.showIcons, d.heatmap.showIcons),
    },
    alert: {
      enabled: bool(alert.enabled, d.alert.enabled),
      idleSeconds: num(alert.idleSeconds, d.alert.idleSeconds),
      repeatSeconds: num(alert.repeatSeconds, d.alert.repeatSeconds),
      sound: sound(alert.sound, d.alert.sound),
    },
    widget: {
      x: nullableNum(widget.x, d.widget.x),
      y: nullableNum(widget.y, d.widget.y),
      width: Math.max(WIDGET_MIN_WIDTH, num(widget.width, d.widget.width)),
      locked: bool(widget.locked, d.widget.locked),
      visible: bool(widget.visible, d.widget.visible),
      displayId: nullableNum(widget.displayId, d.widget.displayId),
    },
    stats: { width: num(stats.width, d.stats.width), height: num(stats.height, d.stats.height) },
    general: { openAtLogin: bool(section(root.general).openAtLogin, d.general.openAtLogin) },
  }
}

/** 소리 파일 존재 여부는 main이 확인한다. */
export function validateSettings(s: Settings): string[] {
  const errors: string[] = []
  const t = s.heatmap.fixedThresholds
  const valid = t.length === 4 && t.every((n, i) => Number.isInteger(n) && n > 0 && (i === 0 || n > t[i - 1]))
  if (!valid) errors.push(SETTINGS_ERRORS.thresholds)
  if (!(s.alert.idleSeconds >= 10)) errors.push(SETTINGS_ERRORS.idle)
  if (!(s.alert.repeatSeconds >= 10)) errors.push(SETTINGS_ERRORS.repeat)
  return errors
}
