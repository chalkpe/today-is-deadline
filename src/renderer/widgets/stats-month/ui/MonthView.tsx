import { relativeMax } from '@renderer/entities/day-stat'
import { AppList } from '@renderer/shared/ui/AppList'
import { CalendarGrid } from '@renderer/shared/ui/CalendarGrid'
import { Card, EmptyCard } from '@renderer/shared/ui/Card'
import { Compare, Tile } from '@renderer/shared/ui/Tile'
import { type DateKey, formatDateKo } from '@shared/model/calendar'
import type { IntensityContext } from '@shared/model/intensity'
import type { Settings } from '@shared/model/settings'
import { formatCount, type MonthStats } from '@shared/model/stats'

type Props = {
  stats: MonthStats
  /** 달력 강도는 위젯과 같은 설정 모드를 따른다 */
  heatmap: Settings['heatmap']
  today: DateKey
  /** 날짜 칸을 누르면 그 날짜의 일 탭으로 간다 */
  onSelectDay(date: DateKey): void
}

/** 월 탭: 타일 4개 → 달력 → 앱별 목록 */
export function MonthView({ stats, heatmap, today, onSelectDay }: Props) {
  const { total, activeDays, bestDay } = stats
  // 상대 모드면 이달 안의 최댓값 기준
  const ctx: IntensityContext =
    heatmap.mode === 'fixed' ? { mode: 'fixed', thresholds: heatmap.fixedThresholds } : { mode: 'relative', max: relativeMax(stats.days) }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 min-[680px]:grid-cols-4">
        <Tile
          label="총 타수"
          value={formatCount(total)}
          sub={<Compare label="지난달보다" current={total} previous={stats.previousTotal} />}
        />
        <Tile label="일 평균" value={formatCount(stats.dailyAverage)} sub={`활동일 ${activeDays}일 기준`} />
        <Tile label="활동 일수" value={`${activeDays} / ${stats.elapsedDays}`} />
        <Tile label="최고의 날" value={bestDay ? formatDateKo(bestDay.date) : '–'} sub={bestDay && `${formatCount(bestDay.total)}타`} />
      </div>
      {total === 0 ? (
        <EmptyCard>기록 없음</EmptyCard>
      ) : (
        <Card heading="날짜별 타수">
          <CalendarGrid
            month={stats.month}
            days={stats.days}
            ctx={ctx}
            baseColor={heatmap.baseColor}
            today={today}
            onSelect={onSelectDay}
          />
        </Card>
      )}
      {stats.apps.length > 0 && (
        <Card heading="앱별">
          <AppList apps={stats.apps} />
        </Card>
      )}
    </div>
  )
}
