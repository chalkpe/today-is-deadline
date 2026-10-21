import type { SoundSetting } from '@shared/model/settings'
import { useSettingsForm } from '../model/useSettingsForm'
import { AlertSection } from './AlertSection'
import { GeneralSection } from './GeneralSection'
import { HeatmapSection } from './HeatmapSection'

type Props = { onPreview(sound: SoundSetting): void }

/** 히트맵·알림·일반 세 묶음. 바꿀 때마다 바로 저장하고, 거부되면 그 묶음 아래에 이유를 보여 준다. */
export function SettingsForm({ onPreview }: Props) {
  const { settings, errors, change } = useSettingsForm()
  if (!settings) return null
  return (
    <>
      <HeatmapSection heatmap={settings.heatmap} errors={errors.heatmap} onChange={change} />
      <AlertSection alert={settings.alert} errors={errors.alert} onChange={change} onPreview={onPreview} />
      <GeneralSection general={settings.general} errors={errors.general} onChange={change} />
    </>
  )
}
