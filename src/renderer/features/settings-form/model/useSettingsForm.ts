import { api, usePush } from '@renderer/shared/lib/ipc'
import type { Settings } from '@shared/model/settings'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { applyField, errorsByGroup, errorsFor, type GroupErrors, groupOf, type SettingsPath } from './form'

export type ChangeField = (path: SettingsPath, value: unknown) => void

const SAVE_FAILED = '설정을 저장하지 못했습니다'

/**
 * 즉시 적용 폼. 필드를 바꾸면 화면에 먼저 반영하고 settings:set을 보낸다.
 * 저장이 거부되면 오류를 해당 묶음 아래에 걸고 마지막으로 저장된 설정으로 되돌린다.
 * 저장된 설정은 main의 push:settings로만 갱신한다(다른 창에서 바꾼 위치·잠금도 함께 따라온다).
 */
export function useSettingsForm(): { settings: Settings | null; errors: GroupErrors; change: ChangeField } {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [errors, setErrors] = useState<GroupErrors>({})
  // 마지막으로 저장된 설정(되돌릴 곳)과 화면에 보이는 설정(다음 변경의 바탕). 연달아 바꿔도 앞의 변경을 잃지 않게 ref로 든다.
  const saved = useRef<Settings | null>(null)
  const shown = useRef<Settings | null>(null)

  const show = (next: Settings) => {
    shown.current = next
    setSettings(next)
  }
  const accept = (next: Settings) => {
    saved.current = next
    show(next)
  }

  const onLoaded = useEffectEvent((loaded: Settings) => {
    // 조회보다 푸시가 먼저 왔으면 푸시가 더 최신이다
    if (!saved.current) accept(loaded)
  })
  useEffect(() => {
    let alive = true
    api.invoke('settings:get').then((loaded) => alive && onLoaded(loaded))
    return () => {
      alive = false
    }
  }, [])
  usePush('push:settings', accept)

  const change: ChangeField = async (path, value) => {
    const base = shown.current
    if (!base) return
    const next = applyField(base, path, value)
    if (next === base) return
    const group = groupOf(path)
    // main과 같은 검사를 먼저 해서 잘못된 값은 화면에 올리지도 보내지도 않는다
    const invalid = errorsFor(next)
    if (invalid.length > 0) {
      setErrors(errorsByGroup(invalid, group))
      return
    }
    show(next)
    // 소리 파일이 없으면 main만 알 수 있으므로 저장 결과도 확인한다
    const rejected = await api.invoke('settings:set', next).catch(() => [SAVE_FAILED])
    if (rejected.length > 0) {
      setErrors(errorsByGroup(rejected, group))
      if (saved.current) show(saved.current)
      return
    }
    setErrors({})
  }

  return { settings, errors, change }
}
