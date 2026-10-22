import { Field } from '@renderer/shared/ui/Field'
import { RadioGroup } from '@renderer/shared/ui/RadioGroup'
import { Section } from '@renderer/shared/ui/Section'
import { Toggle } from '@renderer/shared/ui/Toggle'
import type { Settings } from '@shared/model/settings'
import { APPEARANCES, type Appearance } from '@shared/model/theme'
import type { ChangeField } from '../model/useSettingsForm'

type Props = { general: Settings['general']; alwaysOnTop: boolean; errors?: readonly string[]; onChange: ChangeField }

const APPEARANCE_LABELS: Record<Appearance, string> = { system: '시스템', light: '라이트', dark: '다크' }
const APPEARANCE_OPTIONS = APPEARANCES.map((value) => ({ value, label: APPEARANCE_LABELS[value] }))

export function GeneralSection({ general, alwaysOnTop, errors, onChange }: Props) {
  return (
    <Section heading="일반" errors={errors}>
      <Toggle label="로그인 시 자동 시작" checked={general.openAtLogin} onChange={(checked) => onChange('general.openAtLogin', checked)} />
      <Toggle label="위젯을 항상 위에 표시" checked={alwaysOnTop} onChange={(checked) => onChange('widget.alwaysOnTop', checked)} />
      <Field inline label="외관">
        <RadioGroup
          name="general-appearance"
          value={general.appearance}
          options={APPEARANCE_OPTIONS}
          onChange={(value) => onChange('general.appearance', value)}
        />
      </Field>
    </Section>
  )
}
