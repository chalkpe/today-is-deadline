import { NO_DRAG_REGION } from '@renderer/shared/ui/region'
import { cn } from 'cn'

type Props = { locked: boolean; onToggleLock(): void; onOpenSettings(): void }

const BUTTON = 'flex size-4 items-center justify-center rounded p-0 text-fg-muted hover:bg-control-border/60 hover:text-fg'

/**
 * 패널 오른쪽 위의 잠금·설정 아이콘. 풀려 있으면 패널에 마우스를 올렸을 때만 보이고,
 * 잠겨 있으면 잠긴 것을 바로 알 수 있게 늘 흐리게 보인다.
 */
export function PanelIcons({ locked, onToggleLock, onOpenSettings }: Props) {
  return (
    <div
      className={cn(
        'absolute top-0.5 right-2 flex gap-0.5 rounded bg-panel transition-opacity group-hover:opacity-100',
        locked ? 'opacity-70' : 'opacity-0',
        NO_DRAG_REGION,
      )}
    >
      <button type="button" className={cn(BUTTON, locked && 'text-fg')} onClick={onToggleLock}>
        <LockIcon locked={locked} />
      </button>
      <button type="button" className={BUTTON} onClick={onOpenSettings}>
        <SettingsIcon />
      </button>
    </div>
  )
}

/** 잠김: 채운 몸통 + 닫힌 고리 + 패널색 열쇠 구멍. 풀림: 윤곽선 몸통 + 오른쪽으로 들어 올린 고리(몸통과 틈이 보인다). */
function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="size-3.5">
      <path d={locked ? 'M5.5 7V5a2.5 2.5 0 0 1 5 0v2' : 'M8 7V4.5a2.5 2.5 0 0 1 5 0V5.5'} />
      <rect x={3} y={7} width={10} height={7} rx={1.5} fill={locked ? 'currentColor' : 'none'} />
      {locked && <circle cx={8} cy={10.5} r={1.1} stroke="none" className="fill-panel" />}
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="size-3">
      <path d="M2 4.5h12M2 11.5h12" />
      <circle cx={5.5} cy={4.5} r={1.75} fill="currentColor" />
      <circle cx={10.5} cy={11.5} r={1.75} fill="currentColor" />
    </svg>
  )
}
