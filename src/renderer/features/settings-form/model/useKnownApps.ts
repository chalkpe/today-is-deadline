import { api } from '@renderer/shared/lib/ipc'
import type { KnownApp } from '@shared/model/stats'
import { useEffect, useState } from 'react'

/**
 * 지금까지 집계된 앱 목록(많은 순). enabled일 때 읽고, 창이 포커스를 받을 때마다 다시 읽는다.
 * 다른 앱에서 타자하는 동안 새로 집계된 앱은 설정 창으로 돌아오면 목록에 보인다. 받기 전에는 null.
 */
export function useKnownApps(enabled: boolean): KnownApp[] | null {
  const [apps, setApps] = useState<KnownApp[] | null>(null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    const load = () => {
      api.invoke('apps:list').then(
        (list) => alive && setApps(list),
        () => {},
      )
    }
    load()
    window.addEventListener('focus', load)
    return () => {
      alive = false
      window.removeEventListener('focus', load)
    }
  }, [enabled])
  return apps
}
