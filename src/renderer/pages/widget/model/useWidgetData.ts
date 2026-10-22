import { buildGrid, detailRowCount, type GridColumn, relativeMax } from '@renderer/entities/day-stat'
import { api, usePush } from '@renderer/shared/lib/ipc'
import type { PermissionStatus } from '@shared/ipc/events'
import { type DateKey, heatmapRange, msUntilNextMidnight, toDateKey, visibleWeeks } from '@shared/model/calendar'
import type { IntensityContext } from '@shared/model/intensity'
import { DOW_LABEL_WIDTH, MAX_WEEKS, MIN_WEEKS, PANEL_PADDING, PITCH, panelHeight } from '@shared/model/layout'
import { type Settings, scopeKey } from '@shared/model/settings'
import type { DayDetail, DayTotal, TodayStats } from '@shared/model/stats'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Range = { start: DateKey; end: DateKey }

const labelWidth = (showDayLabels: boolean) => (showDayLabels ? DOW_LABEL_WIDTH : 0)

/** 창 너비에 들어가는 주 수. MIN_WEEKS 이상, MAX_WEEKS(heatmap:range 400일 상한) 이하. */
export function weeksForWidth(width: number, showDayLabels: boolean): number {
  const weeks = visibleWeeks(width - PANEL_PADDING * 2 - labelWidth(showDayLabels), PITCH)
  return Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, weeks))
}

/** MAX_WEEKS를 딱 채우는 창 너비. 더 넓혀도 보이는 주가 늘지 않으므로 리사이즈 상한으로 쓴다. */
export function maxWidgetWidth(showDayLabels: boolean): number {
  return MAX_WEEKS * PITCH + PANEL_PADDING * 2 + labelWidth(showDayLabels)
}

/** 범위 안의 날짜별 합계. 푸시로 받은 오늘 합계로 오늘 칸을 덮어 범위를 다시 조회하지 않고 갱신한다. */
export function visibleTotals(totals: DayTotal[], range: Range, today: TodayStats | null): DayTotal[] {
  const inRange = (date: DateKey) => date >= range.start && date <= range.end
  const shown = totals.filter((t) => inRange(t.date) && t.date !== today?.date)
  return today && inRange(today.date) ? [...shown, { date: today.date, total: today.total }] : shown
}

/** 마지막으로 보낸 요청의 응답만 반영한다. 늦게 도착한 이전 응답이 새 값을 덮지 않게 한다. */
function useLatest<T>(apply: (value: T) => void): (request: Promise<T>) => void {
  const seq = useRef(0)
  return useCallback(
    (request: Promise<T>) => {
      const id = ++seq.current
      request.then((value) => {
        if (id === seq.current) apply(value)
      })
    },
    [apply],
  )
}

export type WidgetData = {
  settings: Settings
  denied: boolean
  today: TodayStats | null
  todayKey: DateKey
  columns: GridColumn[]
  selected: DateKey | null
  select(date: DateKey | null): void
  /** 펼친 하루 내역. 선택이 없거나 권한 안내 중이면 null */
  detail: DayDetail | null
  /** 지금 그리는 내용의 창 높이(panelHeight: 권한 안내 중이면 PERMISSION_NOTICE_HEIGHT). main에 같은 값을 보낸다. */
  height: number
}

/** 위젯 화면의 데이터·선택·창 높이. 설정과 권한 상태를 받기 전에는 null. */
export function useWidgetData(): WidgetData | null {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [permission, setPermission] = useState<PermissionStatus | null>(null)
  const [today, setToday] = useState<TodayStats | null>(null)
  const [todayKey, setTodayKey] = useState(() => toDateKey(new Date()))
  const [width, setWidth] = useState(() => window.innerWidth)
  const [totals, setTotals] = useState<DayTotal[]>([])
  const [selected, setSelected] = useState<DateKey | null>(null)
  const [detail, setDetail] = useState<DayDetail | null>(null)
  const loadTotals = useLatest<DayTotal[]>(setTotals)
  const loadDetail = useLatest<DayDetail | null>(setDetail)

  // 앱 필터가 바뀌면 날짜별 합계·하루 내역을 다시 조회한다. 설정을 받기 전에는 null
  const scope = settings && scopeKey(settings)
  const weeks = weeksForWidth(width, settings?.heatmap.showDayLabels ?? false)
  const range = useMemo(() => heatmapRange(todayKey, weeks), [todayKey, weeks])

  const fetchTotals = () => loadTotals(api.invoke('heatmap:range', range))
  const fetchDetail = () => {
    if (selected !== null) loadDetail(api.invoke('day:detail', selected))
  }

  useEffect(() => {
    api.invoke('settings:get').then(setSettings)
    api.invoke('permission:status').then(setPermission)
    api.invoke('stats:today').then(setToday)
  }, [])

  // 다음 로컬 자정에 날짜를 넘기고 타이머를 다시 건다(일찍 깨면 같은 날짜로 한 번 더 기다린다)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const arm = () => {
      timer = setTimeout(() => {
        setTodayKey(toDateKey(new Date()))
        api.invoke('stats:today').then(setToday)
        arm()
      }, msUntilNextMidnight(new Date()))
    }
    arm()
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // 보이는 범위(너비·요일 라벨·날짜)나 앱 필터가 바뀌면 다시 조회한다
  useEffect(() => {
    if (scope !== null) loadTotals(api.invoke('heatmap:range', range))
  }, [scope, range, loadTotals])

  // biome-ignore lint/correctness/useExhaustiveDependencies: 앱 필터(scope)가 바뀌면 같은 날의 내역도 다시 조회한다
  useEffect(() => {
    loadDetail(selected === null ? Promise.resolve(null) : api.invoke('day:detail', selected))
  }, [selected, scope, loadDetail])

  // 창을 줄여 선택한 날이 보이지 않게 되면 펼침을 닫는다
  useEffect(() => {
    if (selected !== null && selected < range.start) setSelected(null)
  }, [selected, range.start])

  // 날짜별 합계는 앱 필터 말고는 설정과 무관하다. 보이는 범위가 바뀌는 설정(요일 라벨)과 앱 필터는 위의 effect가 다시 조회한다.
  usePush('push:settings', setSettings)
  usePush('push:permission', setPermission)
  usePush('push:today', (next) => {
    setToday(next)
    // 절전 복귀처럼 자정 타이머가 늦을 때는 main이 알려 준 날짜를 따른다
    setTodayKey((key) => (next.date > key ? next.date : key))
    if (next.date === selected) fetchDetail()
  })
  usePush('push:adjustments', () => {
    fetchTotals()
    fetchDetail()
  })

  const denied = permission === 'denied'
  const shownDetail = selected === null || denied ? null : detail
  // 권한 상태를 받기 전에 높이를 정하면 거부 상태로 시작할 때 히트맵 높이로 줄었다가 안내 높이로 다시 늘어난다
  const height =
    settings && permission !== null
      ? panelHeight({
          denied,
          showMonthLabels: settings.heatmap.showMonthLabels,
          showTodayCount: settings.heatmap.showTodayCount,
          // 앱 기록이 없는 날도 '기록 없음' 한 줄을 그린다
          detailRows: shownDetail ? Math.max(1, detailRowCount(shownDetail)) : 0,
        })
      : null

  useEffect(() => {
    if (height !== null) api.invoke('widget:resize', { height })
  }, [height])

  const columns = useMemo(() => {
    if (!settings) return []
    const shown = visibleTotals(totals, range, today)
    const { mode, fixedThresholds } = settings.heatmap
    const ctx: IntensityContext = mode === 'fixed' ? { mode, thresholds: fixedThresholds } : { mode, max: relativeMax(shown) }
    return buildGrid(shown, range, todayKey, ctx)
  }, [settings, totals, range, today, todayKey])

  if (settings === null || height === null) return null
  return { settings, denied, today, todayKey, columns, selected, select: setSelected, detail: shownDetail, height }
}
