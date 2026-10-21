import { OTHERS_COLOR } from '@renderer/shared/lib/color'
import { intensityRelative } from '@shared/model/intensity'
import type { AppShare } from '@shared/model/stats'

/** 상위 앱 밖의 나머지를 묶은 조각의 appId */
export const OTHERS_ID = 'others'

export type Segment = { appId: string; count: number }
export type LegendItem = { key: string; label: string; color: string }

/** 한 막대의 앱별 조각. 상위 앱 순서(0인 앱은 뺀다) 다음에 나머지 합을 others로 붙인다(0이면 생략). */
export function stackSegments(byApp: Record<string, number>, topApps: string[]): Segment[] {
  const segments = topApps.filter((appId) => (byApp[appId] ?? 0) > 0).map((appId) => ({ appId, count: byApp[appId] }))
  const top = new Set(topApps)
  const others = Object.entries(byApp).reduce((sum, [appId, count]) => (top.has(appId) ? sum : sum + count), 0)
  return others > 0 ? [...segments, { appId: OTHERS_ID, count: others }] : segments
}

/** 최댓값을 maxPx로 둔 비율 높이. 0이 아닌 값은 보이도록 최소 1px, 전부 0이면 모두 0 */
export function barHeights(totals: number[], maxPx: number): number[] {
  const max = Math.max(0, ...totals)
  if (max === 0) return totals.map(() => 0)
  return totals.map((total) => (total > 0 ? Math.max(1, Math.round((total / max) * maxPx)) : 0))
}

/** 띠 안의 최댓값 기준 상대 강도 */
export function stripIntensities(strip: number[]): number[] {
  const max = Math.max(0, ...strip)
  return strip.map((value) => intensityRelative(value, max))
}

/** 격자 전체의 최댓값 기준 상대 강도 */
export function gridIntensities(grid: number[][]): number[][] {
  const max = Math.max(0, ...grid.flat())
  return grid.map((row) => row.map((value) => intensityRelative(value, max)))
}

/** 범주색(기타색이 아닌 색)을 받은 상위 앱. 누적 막대는 이 앱들만 따로 쌓고 나머지는 기타로 묶는다. */
export function coloredApps(topApps: string[], colors: Map<string, string>): string[] {
  return topApps.filter((appId) => {
    const color = colors.get(appId)
    return color !== undefined && color !== OTHERS_COLOR
  })
}

/** 누적 막대의 범례. colored(coloredApps) 밖의 앱이 있으면 '기타'를 붙인다. */
export function legendItems(apps: AppShare[], colored: string[], colors: Map<string, string>): LegendItem[] {
  const names = new Map(apps.map((app) => [app.appId, app.name]))
  const items = colored.map((appId) => ({ key: appId, label: names.get(appId) ?? appId, color: colors.get(appId) ?? OTHERS_COLOR }))
  return apps.length > colored.length ? [...items, { key: OTHERS_ID, label: '기타', color: OTHERS_COLOR }] : items
}
