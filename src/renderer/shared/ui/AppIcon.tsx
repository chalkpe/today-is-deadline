import { cn } from 'cn'
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
  return <div className={cn('size-3 shrink-0 rounded-[2px] bg-neutral-600', className)} />
}
