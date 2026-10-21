import { createAlertController } from '@renderer/features/alert-audio'
import { SettingsForm } from '@renderer/features/settings-form'
import { api } from '@renderer/shared/lib/ipc'
import { Page } from '@renderer/shared/ui/Page'
import type { SoundSetting } from '@shared/model/settings'
import { useRef } from 'react'

export function SettingsPage() {
  const audio = useRef<HTMLAudioElement>(null)
  // 위젯의 알림음과 같은 sound:// 주소를 이 창의 숨은 <audio>로 튼다. 다시 누르면 처음부터 다시 튼다.
  const preview = async (sound: SoundSetting) => {
    const url = await api.invoke('sound:url', sound)
    if (audio.current) createAlertController(audio.current).handle({ action: 'play', url })
  }
  return (
    <Page windowTitle="설정">
      <SettingsForm onPreview={preview} />
      <audio ref={audio} className="hidden" />
    </Page>
  )
}
