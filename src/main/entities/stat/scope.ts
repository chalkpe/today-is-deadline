import type { AppScope } from '@shared/model/settings'

/**
 * minute_counts를 앱 필터로 거르는 ` AND …` 조각과 그 인자. scope가 null이면 조건이 없다.
 * 앱 목록은 JSON 배열 하나로 넘겨 앱 수와 무관하게 자리표시자가 하나다.
 */
export function scopeFilter(scope: AppScope, column: string): { sql: string; params: string[] } {
  if (scope === null) return { sql: '', params: [] }
  return { sql: ` AND ${column} IN (SELECT value FROM json_each(?))`, params: [JSON.stringify(scope)] }
}
