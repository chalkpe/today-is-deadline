import { getApp } from '@main/entities/app'
import { dayDetail, dayStats, dayTotals, monthStats, todayStats, weekStats } from '@main/entities/stat'
import type { Db } from '@main/shared/db'
import { type Handlers, requireDateKey, requireDateRange, requireMonthKey } from '@main/shared/ipc'
import { CHANNELS } from '@shared/ipc'
import { mondayOf, toDateKey } from '@shared/model/calendar'

/** heatmap:range 한 번에 조회할 수 있는 최대 일수 */
export const MAX_RANGE_DAYS = 400

type StatsChannel = 'heatmap:range' | 'day:detail' | 'stats:today' | 'stats:day' | 'stats:week' | 'stats:month' | 'app:icon'

export function statsHandlers({ db, now }: { db: Db; now: () => Date }) {
  return {
    [CHANNELS.HEATMAP_RANGE]: (range) => {
      const { start, end } = requireDateRange(range, MAX_RANGE_DAYS)
      return dayTotals(db, start, end)
    },
    [CHANNELS.DAY_DETAIL]: (date) => dayDetail(db, requireDateKey(date)),
    [CHANNELS.TODAY]: () => todayStats(db, toDateKey(now())),
    [CHANNELS.STATS_DAY]: (date) => dayStats(db, requireDateKey(date)),
    // 월요일이 아닌 날짜가 와도 그 주의 월요일로 맞춘다
    [CHANNELS.STATS_WEEK]: (date) => weekStats(db, mondayOf(requireDateKey(date))),
    [CHANNELS.STATS_MONTH]: (month) => monthStats(db, requireMonthKey(month), toDateKey(now())),
    [CHANNELS.APP_ICON]: (appId) => {
      if (typeof appId !== 'string') return null
      const png = getApp(db, appId)?.iconPng
      return png ? `data:image/png;base64,${Buffer.from(png).toString('base64')}` : null
    },
  } satisfies Handlers<StatsChannel>
}
