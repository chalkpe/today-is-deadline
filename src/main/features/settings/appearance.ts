import type { Settings } from '@shared/model/settings'
import type { Appearance } from '@shared/model/theme'
import { themeSourceFor } from '@shared/model/theme'

/** 외관 설정을 테마 소스로 바꿔 적용한다. 직전에 적용한 값과 같으면 다시 호출하지 않는다(첫 호출은 항상 적용). */
export function createAppearanceApplier(deps: { setThemeSource: (source: 'system' | 'light' | 'dark') => void }): {
  apply(settings: Settings): void
} {
  let last: Appearance | undefined
  return {
    apply(settings) {
      const next = settings.general.appearance
      if (next === last) return
      last = next
      deps.setThemeSource(themeSourceFor(next))
    },
  }
}
