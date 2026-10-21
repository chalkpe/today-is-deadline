import { describe, expect, it } from 'vitest'
import { ADJUST_ERRORS, type AdjustDraft, formatDelta, parseDraft } from './form'

const draft = (patch: Partial<AdjustDraft>): AdjustDraft => ({ date: '2026-10-22', delta: '500', memo: '', ...patch })

describe('parseDraft', () => {
  it("'0'은 오류다", () => {
    expect(parseDraft(draft({ delta: '0' }))).toEqual({ ok: false, field: 'delta', error: '0이 아닌 정수를 입력하세요' })
  })

  it("'-500'은 −500이다", () => {
    expect(parseDraft(draft({ delta: '-500' }))).toEqual({ ok: true, value: { date: '2026-10-22', delta: -500, memo: '' } })
  })

  it("'abc'·소수·빈 값은 오류다", () => {
    for (const delta of ['abc', '1.5', '', '   ']) {
      expect(parseDraft(draft({ delta }))).toEqual({ ok: false, field: 'delta', error: ADJUST_ERRORS.delta })
    }
  })

  it('앞뒤 공백과 + 부호를 허용한다', () => {
    expect(parseDraft(draft({ delta: ' +300 ' }))).toMatchObject({ ok: true, value: { delta: 300 } })
  })

  it('날짜가 YYYY-MM-DD가 아니면 오류다', () => {
    for (const date of ['', '2026-13-01', '2026-2-3']) {
      expect(parseDraft(draft({ date }))).toEqual({ ok: false, field: 'date', error: '날짜를 선택하세요' })
    }
  })

  it('메모는 앞뒤 공백을 지운다', () => {
    expect(parseDraft(draft({ memo: '  밀린 기록  ' }))).toMatchObject({ ok: true, value: { memo: '밀린 기록' } })
  })

  it('메모가 200자를 넘으면 오류다', () => {
    expect(parseDraft(draft({ memo: 'a'.repeat(200) }))).toMatchObject({ ok: true })
    expect(parseDraft(draft({ memo: 'a'.repeat(201) }))).toEqual({ ok: false, field: 'memo', error: ADJUST_ERRORS.memo })
  })
})

describe('formatDelta', () => {
  it('양수는 +, 음수는 - 부호를 붙이고 천 단위로 끊는다', () => {
    expect(formatDelta(500)).toBe('+500')
    expect(formatDelta(-1500)).toBe('-1,500')
  })
})
