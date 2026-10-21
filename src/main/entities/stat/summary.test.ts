import { describe, expect, it } from 'vitest'
import { summarizeDays } from './summary'

describe('summarizeDays', () => {
  it('활동일·일평균·최고의 날', () => {
    const r = summarizeDays([
      { date: '2026-10-19', total: 0 },
      { date: '2026-10-21', total: 100 },
      { date: '2026-10-22', total: 2535 },
    ])
    expect(r).toEqual({ total: 2635, activeDays: 2, dailyAverage: 1318, bestDay: { date: '2026-10-22', total: 2535 } })
  })
  it('모두 0이면 bestDay null', () => {
    expect(summarizeDays([{ date: '2026-10-19', total: 0 }])).toEqual({ total: 0, activeDays: 0, dailyAverage: 0, bestDay: null })
  })
})
