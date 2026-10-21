import type { DateKey, MonthKey } from '@shared/model/calendar'
import type { Settings, SoundSetting } from '@shared/model/settings'
import type { Adjustment, DayDetail, DayStats, DayTotal, MonthStats, TodayStats, WeekStats } from '@shared/model/stats'

export type PermissionStatus = 'granted' | 'denied' | 'not-required'

// 채널별 { args, response }
export interface IEvents {
  'settings:get': { args: void; response: Settings }
  'settings:set': { args: Settings; response: string[] } // 오류 목록, 빈 배열 = 저장됨
  'heatmap:range': { args: { start: DateKey; end: DateKey }; response: DayTotal[] }
  'day:detail': { args: DateKey; response: DayDetail }
  'stats:today': { args: void; response: TodayStats }
  'stats:day': { args: DateKey; response: DayStats }
  'stats:week': { args: DateKey; response: WeekStats } // 월요일 날짜
  'stats:month': { args: MonthKey; response: MonthStats }
  'adjust:list': { args: void; response: Adjustment[] }
  'adjust:add': { args: { date: DateKey; delta: number; memo: string }; response: Adjustment }
  'adjust:remove': { args: number; response: void }
  'widget:resize': { args: { width?: number; height?: number }; response: void }
  'widget:openStats': { args: { date?: DateKey }; response: void }
  'widget:openSettings': { args: void; response: void }
  'permission:status': { args: void; response: PermissionStatus }
  'permission:request': { args: void; response: void }
  'permission:openSettings': { args: void; response: void }
  'sound:pickFile': { args: void; response: string | null }
  'sound:url': { args: SoundSetting; response: string } // 'sound://builtin/rooster' | 'sound://file'
  'app:icon': { args: string; response: string | null } // data URL
}
