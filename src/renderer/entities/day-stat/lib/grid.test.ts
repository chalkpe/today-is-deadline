import { describe, expect, it } from 'vitest'
import { buildGrid, detailRowCount, monthLabels, relativeMax } from './grid'

// 2026-10-22는 목요일
const TODAY = '2026-10-22'
const RANGE = { start: '2026-10-05', end: TODAY }

describe('buildGrid', () => {
  const totals = [
    { date: '2026-10-05', total: 50 },
    { date: '2026-10-22', total: 200 },
  ]
  const columns = buildGrid(totals, RANGE, TODAY, { mode: 'relative', max: 200 })

  it('3주 범위는 7칸짜리 열 3개', () => {
    expect(columns).toHaveLength(3)
    expect(columns.every((c) => c.cells.length === 7)).toBe(true)
    expect(columns[0].monday).toBe('2026-10-05')
  })

  it('마지막 열은 목요일 이후가 미래, 오늘은 하나', () => {
    const last = columns[2].cells
    expect(last.map((c) => c.future)).toEqual([false, false, false, false, true, true, true])
    expect(columns.flatMap((c) => c.cells).filter((c) => c.isToday)).toHaveLength(1)
  })

  it('상대 모드에서 최댓값 날은 강도 100, 없는 날은 0', () => {
    expect(columns[2].cells[3].intensity).toBe(100)
    expect(columns[0].cells[1].total).toBe(0)
    expect(columns[0].cells[1].intensity).toBe(0)
  })
})

describe('relativeMax', () => {
  it('최댓값, 비면 0', () => {
    expect(
      relativeMax([
        { date: 'a', total: 3 },
        { date: 'b', total: 9 },
      ]),
    ).toBe(9)
    expect(relativeMax([])).toBe(0)
  })
})

describe('monthLabels', () => {
  const grid = (start: string, end: string) => buildGrid([], { start, end }, end, { mode: 'relative', max: 0 })

  it('열 0 라벨은 다음 2열 안에 다른 라벨이 오면 겹치므로 생략한다', () => {
    expect(monthLabels(grid('2026-09-28', '2026-10-11'))).toEqual([{ column: 1, label: '10월' }])
    expect(monthLabels(grid('2026-09-21', '2026-10-11'))).toEqual([{ column: 2, label: '10월' }])
  })

  it('다음 라벨이 3열 이상 떨어져 있으면 열 0 라벨을 남긴다', () => {
    expect(monthLabels(grid('2026-09-14', '2026-10-11'))).toEqual([
      { column: 0, label: '9월' },
      { column: 3, label: '10월' },
    ])
  })

  it('같은 달이면 열 0만', () => {
    const columns = buildGrid([], { start: '2026-10-05', end: '2026-10-18' }, '2026-10-18', { mode: 'relative', max: 0 })
    expect(monthLabels(columns)).toEqual([{ column: 0, label: '10월' }])
  })
})

describe('detailRowCount', () => {
  const app = (i: number) => ({ appId: `a${i}`, name: `a${i}`, count: 1, ratio: 0.1 })
  const detail = (n: number) => ({ date: TODAY, total: n, adjustment: 0, apps: Array.from({ length: n }, (_, i) => app(i)) })
  it('5개 이하는 그대로, 초과하면 기타 한 줄 추가', () => {
    expect(detailRowCount(detail(0))).toBe(0)
    expect(detailRowCount(detail(5))).toBe(5)
    expect(detailRowCount(detail(8))).toBe(6)
  })

  it('조정만 있고 앱 기록이 없는 날도 앱 행은 0(기록 없음 행은 화면이 따로 그린다)', () => {
    expect(detailRowCount({ date: TODAY, total: 500, adjustment: 500, apps: [] })).toBe(0)
  })
})
