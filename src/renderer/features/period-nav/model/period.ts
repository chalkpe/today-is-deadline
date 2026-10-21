import {
  addDays,
  addMonths,
  type DateKey,
  formatDateKo,
  formatMonthKo,
  formatWeekRangeKo,
  type MonthKey,
  mondayOf,
  monthKeyOf,
} from '@shared/model/calendar'

export type Period = { tab: 'day'; date: DateKey } | { tab: 'week'; monday: DateKey } | { tab: 'month'; month: MonthKey }
export type Tab = Period['tab']

/** 기간의 첫날 */
function startOf(p: Period): DateKey {
  switch (p.tab) {
    case 'day':
      return p.date
    case 'week':
      return p.monday
    case 'month':
      return `${p.month}-01`
  }
}

/** date를 품는 tab 기간. 오늘 뒤의 날짜는 오늘로 맞춘다. */
export function atDate(tab: Tab, date: DateKey, today: DateKey): Period {
  const anchor = date > today ? today : date
  switch (tab) {
    case 'day':
      return { tab, date: anchor }
    case 'week':
      return { tab, monday: mondayOf(anchor) }
    case 'month':
      return { tab, month: monthKeyOf(anchor) }
  }
}

/** 오늘을 품는 기간 */
export function current(tab: Tab, today: DateKey): Period {
  return atDate(tab, today, today)
}

function step(p: Period, dir: -1 | 1): Period {
  switch (p.tab) {
    case 'day':
      return { tab: 'day', date: addDays(p.date, dir) }
    case 'week':
      return { tab: 'week', monday: addDays(p.monday, dir * 7) }
    case 'month':
      return { tab: 'month', month: addMonths(p.month, dir) }
  }
}

/** 이전·다음 기간. 다음 기간이 오늘 뒤에서 시작하면(미래) 그대로 둔다. */
export function shift(p: Period, dir: -1 | 1, today: DateKey): Period {
  const next = step(p, dir)
  return startOf(next) > today ? p : next
}

export function canGoForward(p: Period, today: DateKey): boolean {
  return shift(p, 1, today) !== p
}

/** 같은 날짜를 품는 다른 탭의 기간. 보던 기간이 오늘을 품으면 오늘을, 아니면 그 첫날(주는 월요일, 월은 1일)을 기준으로 삼는다. */
export function switchTab(p: Period, tab: Tab, today: DateKey): Period {
  return atDate(tab, contains(p, today) ? today : startOf(p), today)
}

export function contains(p: Period, date: DateKey): boolean {
  switch (p.tab) {
    case 'day':
      return p.date === date
    case 'week':
      return p.monday === mondayOf(date)
    case 'month':
      return p.month === monthKeyOf(date)
  }
}

export function title(p: Period): string {
  switch (p.tab) {
    case 'day':
      return formatDateKo(p.date)
    case 'week':
      return formatWeekRangeKo(p.monday)
    case 'month':
      return formatMonthKo(p.month)
  }
}
