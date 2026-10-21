import { atDate, type Period, PeriodNav, switchTab, type Tab } from '@renderer/features/period-nav'
import { EmptyCard } from '@renderer/shared/ui/Card'
import { Page } from '@renderer/shared/ui/Page'
import { Tabs } from '@renderer/shared/ui/Tabs'
import { DayView } from '@renderer/widgets/stats-day'
import { MonthView } from '@renderer/widgets/stats-month'
import { WeekView } from '@renderer/widgets/stats-week'
import { type DateKey, isDateKey } from '@shared/model/calendar'
import { useState } from 'react'
import { type StatsView, useStatsData, useToday } from '../model/useStatsData'

const TABS = [
  { value: 'day', label: '일' },
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
] as const satisfies readonly { value: Tab; label: string }[]

/** date는 해시 '#/stats?date=YYYY-MM-DD'의 날짜(위젯 하단 숫자 클릭). 없거나 잘못됐으면 오늘의 일 탭으로 연다. */
export function StatsPage({ date }: { date: string | null }) {
  const today = useToday()
  const [period, setPeriod] = useState<Period>(() => atDate('day', isDateKey(date) ? date : today, today))
  // 이미 열린 창에 다른 날짜로 열기가 오면 해시만 바뀌므로, 바뀐 날짜의 일 탭으로 옮긴다
  const [hashDate, setHashDate] = useState(date)
  if (date !== hashDate) {
    setHashDate(date)
    if (isDateKey(date)) setPeriod(atDate('day', date, today))
  }
  const view = useStatsData(period)
  const openDay = (day: DateKey) => setPeriod(atDate('day', day, today))

  return (
    <Page windowTitle="통계" wide>
      <div className="flex flex-col gap-3">
        <Tabs value={period.tab} options={TABS} onChange={(tab) => setPeriod(switchTab(period, tab, today))} />
        <PeriodNav period={period} today={today} onChange={setPeriod} />
      </div>
      <Content view={view} today={today} onSelectDay={openDay} />
    </Page>
  )
}

type ContentProps = { view: StatsView; today: DateKey; onSelectDay(date: DateKey): void }

function Content({ view: { settings, data, failed }, today, onSelectDay }: ContentProps) {
  if (failed) return <EmptyCard>불러오지 못했습니다</EmptyCard>
  if (!settings || !data) return null
  switch (data.tab) {
    case 'day':
      return <DayView stats={data.stats} baseColor={settings.heatmap.baseColor} />
    case 'week':
      return <WeekView stats={data.stats} baseColor={settings.heatmap.baseColor} today={today} onSelectDay={onSelectDay} />
    case 'month':
      return <MonthView stats={data.stats} heatmap={settings.heatmap} today={today} onSelectDay={onSelectDay} />
  }
}
