import type { FixedThresholds } from './intensity'
import { APPEARANCES, type Appearance } from './theme'

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
  widget: {
    x: number | null
    y: number | null
    width: number
    locked: boolean
    visible: boolean
    displayId: number | null
    alwaysOnTop: boolean
  }
  /** 켜면 included에 든 앱의 입력만 히트맵·통계에 보인다. 목록에 없는 앱(새로 집계된 앱 포함)은 제외다. */
  filter: { enabled: boolean; included: string[] }
  stats: { width: number; height: number }
  general: { openAtLogin: boolean; appearance: Appearance }
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
  widget: { x: null, y: null, width: 320, locked: false, visible: true, displayId: null, alwaysOnTop: true },
  filter: { enabled: false, included: [] },
  stats: { width: 760, height: 640 },
  general: { openAtLogin: false, appearance: 'system' },
}

/** 통계 조회에 넣을 앱 id 목록. null이면 모든 앱 */
export type AppScope = readonly string[] | null

/** 필터가 꺼져 있으면 null(모든 앱), 켜져 있으면 포함한 앱 */
export function appScope(s: Settings): AppScope {
  return s.filter.enabled ? s.filter.included : null
}

/** 앱 범위를 비교하는 문자열. 설정이 바뀌어도 이 값이 같으면 통계를 다시 조회하지 않는다 */
export function scopeKey(s: Settings): string {
  return JSON.stringify(appScope(s))
}

/** 대기 시간(T1)·반복 간격(T2)의 범위(초). 하루를 넘는 값은 받지 않는다. */
export const ALERT_SECONDS_MIN = 10
export const ALERT_SECONDS_MAX = 86400

export const SETTINGS_ERRORS = {
  thresholds: '임계값은 양의 정수 4개가 오름차순이어야 합니다',
  idle: '대기 시간은 10초 이상의 정수여야 합니다',
  idleMax: '대기 시간은 86400초 이하여야 합니다',
  repeat: '반복 간격은 10초 이상의 정수여야 합니다',
  repeatMax: '반복 간격은 86400초 이하여야 합니다',
  soundFile: '소리 파일을 찾을 수 없습니다',
} as const

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const section = (v: unknown): Obj => (isObj(v) ? v : {})
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const nullableNum = (v: unknown, d: number | null) =>
  v === null || (typeof v === 'number' && Number.isFinite(v)) ? (v as number | null) : d
/** 문자열만 남기고 중복을 뺀다. 배열이 아니면 기본값 */
const strings = (v: unknown, d: string[]) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : d)

/** 색 입력(<input type="color">)이 다루는 '#rrggbb'. 다른 문자열은 색 계산(culori)에서 예외가 나므로 타입이 틀린 값으로 본다. */
const isHexColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
const isThresholds = (v: unknown): v is FixedThresholds =>
  Array.isArray(v) && v.length === 4 && v.every((n) => Number.isInteger(n) && n > 0)
const isAscending = (t: readonly number[]) => t.every((n, i) => i === 0 || n > t[i - 1])
const isAlertSeconds = (v: number) => Number.isInteger(v) && v >= ALERT_SECONDS_MIN && v <= ALERT_SECONDS_MAX

function sound(v: unknown, d: SoundSetting): SoundSetting {
  if (!isObj(v)) return d
  if (v.kind === 'builtin' && BUILTIN_SOUNDS.includes(v.name as BuiltinSoundName))
    return { kind: 'builtin', name: v.name as BuiltinSoundName }
  if (v.kind === 'file' && typeof v.path === 'string' && v.path !== '') return { kind: 'file', path: v.path }
  return d
}

/**
 * 어떤 입력이든 던지지 않고, 타입이 틀린 필드만 기본값으로 바꾼다. 범위는 고치지 않는다.
 * settings:set처럼 범위를 벗어난 값을 validateSettings로 거부해야 하는 곳에서 쓴다.
 */
export function coerceSettings(input: unknown): Settings {
  const d = DEFAULT_SETTINGS
  const root = section(input)
  const heatmap = section(root.heatmap)
  const alert = section(root.alert)
  const widget = section(root.widget)
  const filter = section(root.filter)
  const stats = section(root.stats)
  const general = section(root.general)
  return {
    counting: { enabled: bool(section(root.counting).enabled, d.counting.enabled) },
    heatmap: {
      baseColor: isHexColor(heatmap.baseColor) ? heatmap.baseColor : d.heatmap.baseColor,
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
      alwaysOnTop: bool(widget.alwaysOnTop, d.widget.alwaysOnTop),
    },
    filter: { enabled: bool(filter.enabled, d.filter.enabled), included: strings(filter.included, d.filter.included) },
    stats: { width: num(stats.width, d.stats.width), height: num(stats.height, d.stats.height) },
    general: {
      openAtLogin: bool(general.openAtLogin, d.general.openAtLogin),
      appearance: APPEARANCES.includes(general.appearance as Appearance) ? (general.appearance as Appearance) : d.general.appearance,
    },
  }
}

/**
 * 저장된 파일을 읽을 때 쓴다. coerceSettings에 더해 범위를 벗어난 값(오름차순이 아닌 임계값, 10~86400 정수가 아닌 초)도
 * 기본값으로 고친다. 손으로 고친 settings.json이 짧은 알림 반복이나 설정 창에서 고칠 수 없는 상태를 만들지 않게 한다.
 * 결과는 소리 파일 존재 여부를 빼면 항상 validateSettings를 통과한다.
 */
export function normalizeSettings(input: unknown): Settings {
  const s = coerceSettings(input)
  const d = DEFAULT_SETTINGS
  const { heatmap, alert } = s
  return {
    ...s,
    heatmap: { ...heatmap, fixedThresholds: isAscending(heatmap.fixedThresholds) ? heatmap.fixedThresholds : d.heatmap.fixedThresholds },
    alert: {
      ...alert,
      idleSeconds: isAlertSeconds(alert.idleSeconds) ? alert.idleSeconds : d.alert.idleSeconds,
      repeatSeconds: isAlertSeconds(alert.repeatSeconds) ? alert.repeatSeconds : d.alert.repeatSeconds,
    },
  }
}

const secondsError = (v: number, min: string, max: string): string | null => {
  if (!(Number.isInteger(v) && v >= ALERT_SECONDS_MIN)) return min
  return v > ALERT_SECONDS_MAX ? max : null
}

/** 소리 파일 존재 여부는 main이 확인한다. */
export function validateSettings(s: Settings): string[] {
  const t = s.heatmap.fixedThresholds
  const thresholdsOk = t.length === 4 && t.every((n) => Number.isInteger(n) && n > 0) && isAscending(t)
  return [
    thresholdsOk ? null : SETTINGS_ERRORS.thresholds,
    secondsError(s.alert.idleSeconds, SETTINGS_ERRORS.idle, SETTINGS_ERRORS.idleMax),
    secondsError(s.alert.repeatSeconds, SETTINGS_ERRORS.repeat, SETTINGS_ERRORS.repeatMax),
  ].filter((e): e is string => e !== null)
}
