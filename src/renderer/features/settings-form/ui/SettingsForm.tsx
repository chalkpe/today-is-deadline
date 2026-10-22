import type { SoundSetting } from '@shared/model/settings'
import { useSettingsForm } from '../model/useSettingsForm'
import { AlertSection } from './AlertSection'
import { FilterSection } from './FilterSection'
import { GeneralSection } from './GeneralSection'
import { HeatmapSection } from './HeatmapSection'

type Props = { onPreview(sound: SoundSetting): void }

/** 히트맵·앱 필터·알림·일반 네 섹션. 바꿀 때마다 바로 저장하고, 거부되면 그 섹션 아래에 이유를 보여 준다. */
export function SettingsForm({ onPreview }: Props) {
  const { settings, errors, change } = useSettingsForm()
  if (!settings) return null
  return (
    <>
      <HeatmapSection heatmap={settings.heatmap} errors={errors.heatmap} onChange={change} />
      <FilterSection filter={settings.filter} errors={errors.filter} onChange={change} />
      <AlertSection alert={settings.alert} errors={errors.alert} onChange={change} onPreview={onPreview} />
      {/* 항상 위(위젯 묶음)는 일반 섹션에 있으므로 그 오류도 일반 아래에 보여 준다 */}
      <GeneralSection
        general={settings.general}
        alwaysOnTop={settings.widget.alwaysOnTop}
        errors={[...(errors.general ?? []), ...(errors.widget ?? [])]}
        onChange={change}
      />
    </>
  )
}
