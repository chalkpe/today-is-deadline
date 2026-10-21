export const APP_PALETTE = ['#3b82f6', '#a855f7', '#f97316', '#22c55e'] as const
export const OTHERS_COLOR = '#6b7280'

/** 상위 앱부터 순서대로 범주색을 배정하고, 팔레트가 모자라면 기타색을 쓴다. */
export function assignAppColors(topAppIds: string[]): Map<string, string> {
  return new Map(topAppIds.map((id, i) => [id, APP_PALETTE[i] ?? OTHERS_COLOR]))
}
