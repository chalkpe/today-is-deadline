import { AppIcon } from '@renderer/shared/ui/AppIcon'
import { formatDateKo } from '@shared/model/calendar'
import { DETAIL_HEADER_HEIGHT, DETAIL_ROW_HEIGHT } from '@shared/model/layout'
import { type DayDetail as DayDetailData, foldApps, formatCount, formatPercent } from '@shared/model/stats'

type Props = { detail: DayDetailData; showIcons: boolean }

export function DayDetail({ detail, showIcons }: Props) {
  const { shown, others } = foldApps(detail.apps, 5)
  return (
    <div className="text-[11px] text-neutral-200">
      <div className="flex items-center justify-between gap-2" style={{ height: DETAIL_HEADER_HEIGHT }}>
        <div className="min-w-0 truncate font-semibold">{`${formatDateKo(detail.date)} · ${formatCount(detail.total)}타`}</div>
        {detail.adjustment !== 0 && (
          <div className="shrink-0 text-[10px] text-neutral-400">{`조정 ${detail.adjustment >= 0 ? '+' : ''}${formatCount(detail.adjustment)}`}</div>
        )}
      </div>
      {shown.length === 0 && (
        // 앱 기록이 없는 날(0타·조정만 있는 날)도 펼침은 한 줄을 그린다. 높이는 detailRows 최소 1과 맞는다.
        <div className="flex items-center text-neutral-500" style={{ height: DETAIL_ROW_HEIGHT }}>
          기록 없음
        </div>
      )}
      {shown.map((app) => (
        <div key={app.appId} className="flex items-center gap-1.5" style={{ height: DETAIL_ROW_HEIGHT }}>
          {showIcons && <AppIcon appId={app.appId} />}
          {/* 좁은 창에서는 막대 다음으로 이름이 줄어 숫자가 패널 밖으로 밀리지 않는다 */}
          <span className="w-20 min-w-0 truncate">{app.name}</span>
          <div className="h-1.5 min-w-0 flex-1 rounded-full bg-neutral-700">
            <div className="h-full rounded-full bg-neutral-300" style={{ width: `${app.ratio * 100}%` }} />
          </div>
          <span className="shrink-0 text-neutral-400">{`${formatCount(app.count)} · ${formatPercent(app.ratio)}`}</span>
        </div>
      ))}
      {others && (
        <div className="flex items-center gap-1.5 text-neutral-400" style={{ height: DETAIL_ROW_HEIGHT }}>
          <span className="min-w-0 flex-1 truncate">{`기타 ${others.appCount}개`}</span>
          <span className="shrink-0">{`${formatCount(others.count)} · ${formatPercent(others.ratio)}`}</span>
        </div>
      )}
    </div>
  )
}
