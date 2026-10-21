import { type AppShare, formatCount, formatPercent } from '@shared/model/stats'
import { AppIcon } from './AppIcon'

/** 기간의 앱별 전체 목록(많은 순). 막대는 기간 합계 대비 비율 */
export function AppList({ apps }: { apps: AppShare[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {apps.map((app) => (
        <div key={app.appId} className="flex items-center gap-2">
          <AppIcon appId={app.appId} className="size-4" />
          {/* 좁은 창에서는 이름이 먼저 줄어 숫자가 밀려나지 않는다 */}
          <span className="w-40 min-w-0 shrink truncate text-neutral-200">{app.name}</span>
          <div className="h-1.5 min-w-8 flex-1 rounded-full bg-neutral-700">
            <div className="h-full rounded-full bg-neutral-300" style={{ width: `${app.ratio * 100}%` }} />
          </div>
          <span className="w-32 shrink-0 text-right text-xs text-neutral-400 tabular-nums">{`${formatCount(app.count)} · ${formatPercent(app.ratio)}`}</span>
        </div>
      ))}
    </div>
  )
}
