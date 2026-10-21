import { type DateKey, isDateKey } from '@shared/model/calendar'
import { formatCount } from '@shared/model/stats'

export type AdjustDraft = { date: DateKey; delta: string; memo: string }
export type AdjustValue = { date: DateKey; delta: number; memo: string }
export type AdjustField = keyof AdjustDraft

export const MEMO_MAX_LENGTH = 200

export const ADJUST_ERRORS = {
  date: '날짜를 선택하세요',
  delta: '0이 아닌 정수를 입력하세요',
  memo: `메모는 ${MEMO_MAX_LENGTH}자까지 쓸 수 있습니다`,
} as const satisfies Record<AdjustField, string>

/** 입력 순서(날짜 → 수치 → 메모)대로 첫 오류 하나만 돌려준다. field는 오류를 보여 줄 입력칸이다. */
export function parseDraft(d: AdjustDraft): { ok: true; value: AdjustValue } | { ok: false; field: AdjustField; error: string } {
  if (!isDateKey(d.date)) return { ok: false, field: 'date', error: ADJUST_ERRORS.date }
  // 빈 값·공백은 Number가 0으로 바꾸므로 0 검사에 함께 걸린다
  const delta = Number(d.delta.trim())
  if (!Number.isSafeInteger(delta) || delta === 0) return { ok: false, field: 'delta', error: ADJUST_ERRORS.delta }
  const memo = d.memo.trim()
  if (memo.length > MEMO_MAX_LENGTH) return { ok: false, field: 'memo', error: ADJUST_ERRORS.memo }
  return { ok: true, value: { date: d.date, delta, memo } }
}

/** 조정 수치를 부호와 함께 적는다(음수 부호는 formatCount가 붙인다) */
export function formatDelta(delta: number): string {
  return `${delta > 0 ? '+' : ''}${formatCount(delta)}`
}
