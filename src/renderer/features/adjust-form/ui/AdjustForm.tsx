import { api } from '@renderer/shared/lib/ipc'
import { Button } from '@renderer/shared/ui/Button'
import { Field } from '@renderer/shared/ui/Field'
import { TextInput } from '@renderer/shared/ui/TextInput'
import { toDateKey } from '@shared/model/calendar'
import { type FormEvent, useState } from 'react'
import { type AdjustDraft, type AdjustField, MEMO_MAX_LENGTH, parseDraft } from '../model/form'

type FormError = { field: AdjustField | 'form'; message: string }

const SAVE_FAILED = '저장하지 못했습니다'

/** 날짜·수치·메모를 받아 adjust:add로 저장한다. 목록은 main의 push:adjustments로 갱신된다. */
export function AdjustForm() {
  const [draft, setDraft] = useState<AdjustDraft>(() => ({ date: toDateKey(new Date()), delta: '', memo: '' }))
  const [error, setError] = useState<FormError | null>(null)
  const [saving, setSaving] = useState(false)

  const edit = (field: AdjustField, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
    // 오류가 난 칸을 고치기 시작하면 문구를 지운다
    setError((prev) => (prev?.field === field ? null : prev))
  }
  const errorOf = (field: FormError['field']) => (error?.field === field ? error.message : null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = parseDraft(draft)
    if (!parsed.ok) {
      setError({ field: parsed.field, message: parsed.error })
      return
    }
    setSaving(true)
    try {
      await api.invoke('adjust:add', parsed.value)
      // 같은 날짜에 이어서 넣기 쉽도록 날짜는 남긴다
      setDraft((prev) => ({ ...prev, delta: '', memo: '' }))
      setError(null)
    } catch {
      setError({ field: 'form', message: SAVE_FAILED })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="grid grid-cols-2 gap-3" onSubmit={submit}>
      <Field label="날짜" error={errorOf('date')}>
        <TextInput type="date" value={draft.date} onChange={(event) => edit('date', event.target.value)} />
      </Field>
      <Field label="수치" error={errorOf('delta')}>
        <TextInput
          value={draft.delta}
          placeholder="500 또는 -500"
          className="tabular-nums"
          onChange={(event) => edit('delta', event.target.value)}
        />
      </Field>
      <Field label="메모" error={errorOf('memo')} className="col-span-2">
        <TextInput
          value={draft.memo}
          placeholder="선택"
          maxLength={MEMO_MAX_LENGTH}
          onChange={(event) => edit('memo', event.target.value)}
        />
      </Field>
      <div className="col-span-2 flex items-center justify-end gap-3">
        {error?.field === 'form' && <p className="text-xs text-red-600 dark:text-red-400">{error.message}</p>}
        <Button type="submit" variant="primary" disabled={saving}>
          저장
        </Button>
      </div>
    </form>
  )
}
