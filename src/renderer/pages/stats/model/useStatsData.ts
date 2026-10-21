import { contains, type Period } from '@renderer/features/period-nav'
import { APP_PALETTE } from '@renderer/shared/lib/color'
import { api, usePush } from '@renderer/shared/lib/ipc'
import { type DateKey, msUntilNextMidnight, toDateKey } from '@shared/model/calendar'
import { DEFAULT_SETTINGS, type Settings } from '@shared/model/settings'
import { type DayStats, type MonthStats, topAppIds, type WeekStats } from '@shared/model/stats'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type ColorRegistry, createColorRegistry } from './appColors'

type Fetched = { tab: 'day'; stats: DayStats } | { tab: 'week'; stats: WeekStats } | { tab: 'month'; stats: MonthStats }

/**
 * 탭과 응답 타입을 묶어 둔다. 기간을 바꾼 직후에는 새 응답이 올 때까지 이전 탭의 데이터를 그대로 그린다.
 * colors는 이 기간의 상위 앱 색(창이 열려 있는 동안 같은 앱은 같은 색)이다.
 */
export type StatsData = Fetched & { colors: Map<string, string> }

export type StatsView = {
  /** 받기 전에는 null. 조회가 실패하면 기본 설정 */
  settings: Settings | null
  data: StatsData | null
  /** 마지막 조회가 거부됐다 */
  failed: boolean
}

function fetchPeriod(p: Period): Promise<Fetched> {
  switch (p.tab) {
    case 'day':
      return api.invoke('stats:day', p.date).then((stats) => ({ tab: 'day', stats }))
    case 'week':
      return api.invoke('stats:week', p.monday).then((stats) => ({ tab: 'week', stats }))
    case 'month':
      return api.invoke('stats:month', p.month).then((stats) => ({ tab: 'month', stats }))
  }
}

/** 상위 앱(많은 순). 월 통계에는 topApps가 없어 앱 목록에서 팔레트 색 수만큼 고른다. */
const topAppsOf = (fetched: Fetched) =>
  fetched.tab === 'month' ? topAppIds(fetched.stats.apps, APP_PALETTE.length) : fetched.stats.topApps

/** 로컬 오늘 날짜. 자정 타이머로 넘기고, 절전 복귀처럼 타이머가 늦으면 push:today의 날짜를 따른다. */
export function useToday(): DateKey {
  const [today, setToday] = useState(() => toDateKey(new Date()))
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    // 일찍 깨면 같은 날짜로 한 번 더 기다린다
    const arm = () => {
      timer = setTimeout(() => {
        setToday(toDateKey(new Date()))
        arm()
      }, msUntilNextMidnight(new Date()))
    }
    arm()
    return () => clearTimeout(timer)
  }, [])
  usePush('push:today', (next) => setToday((key) => (next.date > key ? next.date : key)))
  return today
}

/** 기간의 통계와 색 설정. 오늘을 품는 기간이면 push:today마다, 조정이 바뀌면 언제나 다시 조회한다. */
export function useStatsData(period: Period): StatsView {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [result, setResult] = useState<{ data: StatsData | null; failed: boolean }>({ data: null, failed: false })
  const seq = useRef(0)
  // 창(페이지) 수명 동안 하나만 둔다
  const registry = useRef<ColorRegistry | null>(null)

  // 마지막으로 보낸 요청의 응답만 반영한다. 늦게 온 이전 기간의 응답이 새 기간을 덮지 않게 한다.
  const load = useCallback((p: Period) => {
    const id = ++seq.current
    fetchPeriod(p).then(
      (fetched) => {
        if (id !== seq.current) return
        registry.current ??= createColorRegistry()
        setResult({ data: { ...fetched, colors: registry.current.colorsFor(topAppsOf(fetched)) }, failed: false })
      },
      () => id === seq.current && setResult({ data: null, failed: true }),
    )
  }, [])

  useEffect(() => load(period), [period, load])

  useEffect(() => {
    let alive = true
    // 조회보다 푸시가 먼저 왔으면 푸시가 더 최신이다
    api.invoke('settings:get').then(
      (loaded) => alive && setSettings((prev) => prev ?? loaded),
      () => alive && setSettings((prev) => prev ?? DEFAULT_SETTINGS),
    )
    return () => {
      alive = false
    }
  }, [])

  usePush('push:settings', setSettings)
  usePush('push:today', (next) => {
    if (contains(period, next.date)) load(period)
  })
  // 지난 날짜의 조정도 이 기간의 합계를 바꿀 수 있다
  usePush('push:adjustments', () => load(period))

  return { settings, ...result }
}
