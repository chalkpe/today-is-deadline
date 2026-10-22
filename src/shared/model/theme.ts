export type Theme = 'light' | 'dark'
export type Appearance = 'system' | Theme
export const APPEARANCES: readonly Appearance[] = ['system', 'light', 'dark']

/** system이면 OS 다크 여부를 따르고, 아니면 지정한 테마를 그대로 쓴다. */
export function resolveTheme(appearance: Appearance, systemDark: boolean): Theme {
  if (appearance === 'system') return systemDark ? 'dark' : 'light'
  return appearance
}

/** nativeTheme.themeSource에 넘기기 위한 타입 경계용 항등 함수 */
export function themeSourceFor(appearance: Appearance): 'system' | 'light' | 'dark' {
  return appearance
}
