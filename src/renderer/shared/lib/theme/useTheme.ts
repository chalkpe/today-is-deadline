import type { Theme } from '@shared/model/theme'
import { useSyncExternalStore } from 'react'

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function themeFromMatch(matches: boolean): Theme {
  return matches ? 'dark' : 'light'
}

// main이 설정의 외관을 nativeTheme.themeSource로 넣으므로 prefers-color-scheme이 시스템·라이트·다크 선택을 그대로 따른다
function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getSnapshot(): Theme {
  return themeFromMatch(window.matchMedia(DARK_QUERY).matches)
}

/** 지금 창의 테마. 외관 설정이나 OS 외관이 바뀌면 다시 그린다. CSS 토큰과 같은 기준이라 JS 색(cellColor)도 함께 바뀐다. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot)
}
