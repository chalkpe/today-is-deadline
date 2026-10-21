import { SETTINGS_ERRORS, type Settings, validateSettings } from '@shared/model/settings'

/** 설정 창에서 바꾸는 필드의 점 경로. 임계값은 배열 칸 번호까지 적는다. */
export type SettingsPath =
  | 'heatmap.baseColor'
  | 'heatmap.mode'
  | `heatmap.fixedThresholds.${0 | 1 | 2 | 3}`
  | 'heatmap.showTodayCount'
  | 'heatmap.showMonthLabels'
  | 'heatmap.showDayLabels'
  | 'heatmap.showIcons'
  | 'alert.enabled'
  | 'alert.idleSeconds'
  | 'alert.repeatSeconds'
  | 'alert.sound'
  | 'general.openAtLogin'

/** 설정 창의 묶음(히트맵·알림·일반). 오류는 바꾼 필드의 묶음 아래에 보여 준다. */
export type SettingsGroup = SettingsPath extends `${infer G}.${string}` ? G : never

export function groupOf(path: SettingsPath): SettingsGroup {
  return path.slice(0, path.indexOf('.')) as SettingsGroup
}

export type GroupErrors = Partial<Record<SettingsGroup, string[]>>

// 검증 오류 종류마다 묶음을 정한다. SETTINGS_ERRORS에 항목이 늘면 여기서 컴파일 오류가 난다.
const GROUP_OF_ERROR: Record<keyof typeof SETTINGS_ERRORS, SettingsGroup> = {
  thresholds: 'heatmap',
  idle: 'alert',
  idleMax: 'alert',
  repeat: 'alert',
  repeatMax: 'alert',
  soundFile: 'alert',
}
const ERROR_GROUP: Record<string, SettingsGroup> = Object.fromEntries(
  Object.entries(GROUP_OF_ERROR).map(([key, group]) => [SETTINGS_ERRORS[key as keyof typeof SETTINGS_ERRORS], group]),
)

/** 오류 문구를 그 필드가 있는 묶음으로 나눈다. 모르는 문구(저장 실패 등)는 바꾼 필드의 묶음에 둔다. */
export function errorsByGroup(messages: readonly string[], fallback: SettingsGroup): GroupErrors {
  const result: GroupErrors = {}
  for (const message of messages) {
    const group = ERROR_GROUP[message] ?? fallback
    result[group] = [...(result[group] ?? []), message]
  }
  return result
}

const NUMERIC_PATH = /^(heatmap\.fixedThresholds\.\d|alert\.(idle|repeat)Seconds)$/

/** 경로를 따라 내려가며 지나는 객체·배열만 복사한다. 나머지 묶음은 그대로 공유한다. */
function setIn(target: unknown, keys: string[], value: unknown): unknown {
  if (keys.length === 0) return value
  const [key, ...rest] = keys
  if (Array.isArray(target)) {
    const copy = [...target]
    copy[Number(key)] = setIn(target[Number(key)], rest, value)
    return copy
  }
  const obj = target as Record<string, unknown>
  return { ...obj, [key]: setIn(obj[key], rest, value) }
}

/** 불변 갱신. 숫자 필드는 입력 문자열을 Number로 바꾸고, 숫자가 아니면 바꾸지 않고 원본을 돌려준다. */
export function applyField(s: Settings, path: SettingsPath, value: unknown): Settings {
  let next = value
  if (NUMERIC_PATH.test(path)) {
    next = Number(value)
    if (!Number.isFinite(next)) return s
  }
  return setIn(s, path.split('.'), next) as Settings
}

export function errorsFor(s: Settings): string[] {
  return validateSettings(s)
}

/** 소리 파일 경로의 파일 이름(macOS `/`, Windows `\` 모두) */
export function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() || path
}
