import { useEffect, useState } from 'react'
import { api } from '../lib/ipc'

const cache = new Map<string, Promise<string | null>>()

function loadIcon(appId: string): Promise<string | null> {
  let hit = cache.get(appId)
  if (!hit) {
    hit = api.invoke('app:icon', appId).catch(() => null)
    cache.set(appId, hit)
  }
  return hit
}

export function AppIcon({ appId }: { appId: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    loadIcon(appId).then((url) => alive && setSrc(url))
    return () => {
      alive = false
    }
  }, [appId])
  if (src) return <img src={src} className="size-3 shrink-0" />
  return <div className="size-3 shrink-0 rounded-[2px] bg-neutral-600" />
}
