import { APP_PALETTE, OTHERS_COLOR } from '@renderer/shared/lib/color'

export type ColorRegistry = {
  /** 상위 앱마다 색(topApps 순서). 범주색을 못 받은 앱은 기타색이고 그림에서는 기타로 묶인다. */
  colorsFor(topApps: string[]): Map<string, string>
}

/**
 * 통계 창이 열려 있는 동안 앱의 범주색을 기억한다(스펙 7.3: 같은 앱은 같은 색).
 * 처음 보는 앱은 아직 안 쓴 팔레트 색을 순서대로 받고, 팔레트가 다 쓰였으면 기타색이다. 한번 받은 색은 바뀌지 않는다.
 */
export function createColorRegistry(): ColorRegistry {
  const assigned = new Map<string, string>()
  return {
    colorsFor(topApps) {
      for (const appId of topApps) {
        if (assigned.has(appId)) continue
        const used = new Set(assigned.values())
        const free = APP_PALETTE.find((color) => !used.has(color))
        if (free) assigned.set(appId, free)
      }
      return new Map(topApps.map((appId) => [appId, assigned.get(appId) ?? OTHERS_COLOR]))
    },
  }
}
