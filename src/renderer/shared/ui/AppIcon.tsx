import { cn } from 'cn'
import { useEffect, useState } from 'react'
import { api } from '../lib/ipc'

const cache = new Map<string, Promise<string | null>>()

/** 얻은 아이콘만 창이 살아 있는 동안 기억한다. 첫 키다운 뒤 아이콘 저장이 끝나기 전에 물으면 null이므로, null·실패는 다음 마운트 때 다시 묻는다. */
function loadIcon(appId: string): Promise<string | null> {
  let hit = cache.get(appId)
  if (!hit) {
    hit = api
      .invoke('app:icon', appId)
      .catch(() => null)
      .then((url) => {
        if (url === null) cache.delete(appId)
        return url
      })
    cache.set(appId, hit)
  }
  return hit
}

/** 기본 크기는 12px. className으로 크기를 바꾼다. */
export function AppIcon({ appId, className }: { appId: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    loadIcon(appId).then((url) => alive && setSrc(url))
    return () => {
      alive = false
    }
  }, [appId])
  if (src) return <img src={src} className={cn('size-3 shrink-0', className)} />
  return <div className={cn('size-3 shrink-0 rounded-[2px] bg-cell-empty', className)} />
}
