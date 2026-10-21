import { AppList } from '@renderer/shared/ui/AppList'
import { Card, EmptyCard } from '@renderer/shared/ui/Card'
import { coloredApps, legendItems, stackSegments } from '@renderer/shared/ui/charts'
import { HourAxis } from '@renderer/shared/ui/HourAxis'
import { Legend } from '@renderer/shared/ui/Legend'
import { StackedBars } from '@renderer/shared/ui/StackedBars'
import { Strip } from '@renderer/shared/ui/Strip'
import { Compare, Tile } from '@renderer/shared/ui/Tile'
import { type DayStats, formatCount, formatDuration, formatMinute } from '@shared/model/stats'

const BARS_HEIGHT = 160

type Props = {
  stats: DayStats
  /** 상위 앱 색(창이 열려 있는 동안 같은 앱은 같은 색) */
  colors: Map<string, string>
  baseColor: string
}

/** 일 탭: 타일 4개 → 시간별 누적 막대 + 10분 띠 → 앱별 목록 */
export function DayView({ stats, colors, baseColor }: Props) {
  const { total, adjustment, peakHour, longestGap } = stats
  const top = coloredApps(stats.topApps, colors)
  const bars = stats.hourly.map((bucket) => ({
    key: String(bucket.hour),
    total: bucket.total,
    segments: stackSegments(bucket.byApp, top),
  }))
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 min-[680px]:grid-cols-4">
        <Tile
          label="총 타수"
          value={formatCount(total)}
          sub={
            <>
              <Compare label="어제보다" current={total} previous={stats.previousTotal} />
              {adjustment !== 0 && <span>{`조정 ${adjustment > 0 ? '+' : ''}${formatCount(adjustment)} 포함`}</span>}
            </>
          }
        />
        <Tile label="활동 시간" value={formatDuration(stats.activeMinutes)} />
        <Tile label="최고 시간대" value={peakHour ? `${peakHour.hour}시` : '–'} sub={peakHour && `${formatCount(peakHour.count)}타`} />
        <Tile
          label="가장 긴 공백"
          value={longestGap ? formatDuration(longestGap.minutes) : '–'}
          sub={longestGap && `${formatMinute(longestGap.from)} ~ ${formatMinute(longestGap.to)}`}
        />
      </div>
      {total === 0 ? (
        <EmptyCard>기록 없음</EmptyCard>
      ) : (
        <>
          <Card heading="시간별 타수" aside={<Legend items={legendItems(stats.apps, top, colors)} />}>
            <StackedBars bars={bars} colors={colors} height={BARS_HEIGHT} />
            <HourAxis />
          </Card>
          <Card heading="10분 단위">
            <Strip values={stats.strip} baseColor={baseColor} />
            <HourAxis />
          </Card>
        </>
      )}
      {stats.apps.length > 0 && (
        <Card heading="앱별">
          <AppList apps={stats.apps} colors={colors} />
        </Card>
      )}
    </div>
  )
}
