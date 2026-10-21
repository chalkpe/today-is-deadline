import { AppList } from '@renderer/shared/ui/AppList'
import { Card, EmptyCard } from '@renderer/shared/ui/Card'
import { appColors, legendItems, stackSegments } from '@renderer/shared/ui/charts'
import { DowHourGrid } from '@renderer/shared/ui/DowHourGrid'
import { Legend } from '@renderer/shared/ui/Legend'
import { StackedBars } from '@renderer/shared/ui/StackedBars'
import { Compare, Tile } from '@renderer/shared/ui/Tile'
import { type DateKey, formatDateKo, WEEKDAYS_KO, weekdayIndex } from '@shared/model/calendar'
import { formatCount, type WeekStats } from '@shared/model/stats'

const BARS_HEIGHT = 160

type Props = {
  stats: WeekStats
  baseColor: string
  today: DateKey
  /** 날짜 막대를 누르면 그 날짜의 일 탭으로 간다 */
  onSelectDay(date: DateKey): void
}

/** 주 탭: 타일 4개 → 날짜별 누적 막대 + 요일×시간 히트맵 → 앱별 목록 */
export function WeekView({ stats, baseColor, today, onSelectDay }: Props) {
  const { total, activeDays, bestDay, topApps } = stats
  const bars = stats.daily.map((day) => ({
    key: day.date,
    total: day.total,
    segments: stackSegments(day.byApp, topApps),
    label: WEEKDAYS_KO[weekdayIndex(day.date)],
    disabled: day.date > today,
  }))
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 min-[680px]:grid-cols-4">
        <Tile
          label="총 타수"
          value={formatCount(total)}
          sub={<Compare label="지난주보다" current={total} previous={stats.previousTotal} />}
        />
        <Tile label="일 평균" value={formatCount(stats.dailyAverage)} sub={`활동일 ${activeDays}일 기준`} />
        <Tile label="활동 일수" value={`${activeDays} / 7`} />
        <Tile label="최고의 날" value={bestDay ? formatDateKo(bestDay.date) : '–'} sub={bestDay && `${formatCount(bestDay.total)}타`} />
      </div>
      {total === 0 ? (
        <EmptyCard>기록 없음</EmptyCard>
      ) : (
        <>
          <Card heading="날짜별 타수" aside={<Legend items={legendItems(stats.apps, topApps)} />}>
            <StackedBars bars={bars} colors={appColors(topApps)} height={BARS_HEIGHT} onSelect={onSelectDay} />
          </Card>
          <Card heading="요일 × 시간">
            <DowHourGrid grid={stats.dowHour} baseColor={baseColor} />
          </Card>
        </>
      )}
      {stats.apps.length > 0 && (
        <Card heading="앱별">
          <AppList apps={stats.apps} />
        </Card>
      )}
    </div>
  )
}
