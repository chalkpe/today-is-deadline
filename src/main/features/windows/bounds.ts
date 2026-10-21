export type Rect = { x: number; y: number; width: number; height: number }

const MIN_OVERLAP = 32

function intersection(a: Rect, b: Rect): { w: number; h: number } {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return { w, h }
}

/** 창이 어떤 display와도 충분히 겹치지 않으면 primary 안쪽으로, 아니면 가장 많이 겹치는 display 안으로 밀어 넣는다. */
export function clampToDisplays(bounds: Rect, displays: Rect[], primary: Rect): { x: number; y: number } {
  let best: Rect | null = null
  let bestArea = 0
  for (const d of displays) {
    const { w, h } = intersection(bounds, d)
    if (w < MIN_OVERLAP || h < MIN_OVERLAP) continue
    if (w * h > bestArea) {
      best = d
      bestArea = w * h
    }
  }
  if (!best) return { x: primary.x + 40, y: primary.y + 40 }
  const x = Math.max(Math.min(bounds.x, best.x + best.width - bounds.width), best.x)
  const y = Math.max(Math.min(bounds.y, best.y + best.height - bounds.height), best.y)
  return { x, y }
}
