import { Section } from '@renderer/shared/ui/Section'
import { Toggle } from '@renderer/shared/ui/Toggle'
import type { Settings } from '@shared/model/settings'
import type { ChangeField } from '../model/useSettingsForm'

type Props = { general: Settings['general']; errors?: readonly string[]; onChange: ChangeField }

export function GeneralSection({ general, errors, onChange }: Props) {
  return (
    <Section heading="일반" errors={errors}>
      <Toggle label="로그인 시 자동 시작" checked={general.openAtLogin} onChange={(checked) => onChange('general.openAtLogin', checked)} />
    </Section>
  )
}
