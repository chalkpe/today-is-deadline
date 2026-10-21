import { WidgetPage } from '@renderer/pages/widget'
import { useEffect, useState } from 'react'

/** '#/stats?date=…' → 'stats' */
const routeOf = (hash: string) => hash.replace(/^#\/?/, '').split('?')[0]

/** 모든 창이 같은 문서를 해시 경로로 나눠 쓴다. 이미 열린 창의 경로 이동은 hashchange로 온다. */
export function Router() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  switch (routeOf(hash)) {
    case 'stats':
    case 'settings':
    case 'adjust':
      return <p>준비 중</p>
    default:
      return <WidgetPage />
  }
}
