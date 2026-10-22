import { api } from '@renderer/shared/lib/ipc'
import { Button } from '@renderer/shared/ui/Button'
import { Field } from '@renderer/shared/ui/Field'
import { NumberInput } from '@renderer/shared/ui/NumberInput'
import { RadioGroup } from '@renderer/shared/ui/RadioGroup'
import { Section } from '@renderer/shared/ui/Section'
import { Toggle } from '@renderer/shared/ui/Toggle'
import {
  ALERT_SECONDS_MAX,
  ALERT_SECONDS_MIN,
  BUILTIN_SOUNDS,
  type BuiltinSoundName,
  type Settings,
  type SoundSetting,
} from '@shared/model/settings'
import { fileNameOf } from '../model/form'
import type { ChangeField } from '../model/useSettingsForm'

type Props = { alert: Settings['alert']; errors?: readonly string[]; onChange: ChangeField; onPreview(sound: SoundSetting): void }

const SOUND_LABELS: Record<BuiltinSoundName, string> = { rooster: '수탉', 'dog-barking': '개 짖는 소리', 'fire-alarm': '화재 경보' }
const SOUND_OPTIONS = BUILTIN_SOUNDS.map((name) => ({ value: name, label: SOUND_LABELS[name] }))

function Seconds({ value, onCommit }: { value: number; onCommit(text: string): void }) {
  return (
    <span className="flex items-center gap-1.5">
      <NumberInput value={value} min={ALERT_SECONDS_MIN} max={ALERT_SECONDS_MAX} step={10} onCommit={onCommit} />
      <span className="text-fg-muted">초</span>
    </span>
  )
}

export function AlertSection({ alert, errors, onChange, onPreview }: Props) {
  const { sound } = alert
  const pickFile = async () => {
    const path = await api.invoke('sound:pickFile')
    // 취소하면 null이다
    if (path) onChange('alert.sound', { kind: 'file', path })
  }
  return (
    <Section heading="알림" errors={errors}>
      <Toggle label="알림 켜기" checked={alert.enabled} onChange={(checked) => onChange('alert.enabled', checked)} />
      <Field inline label="첫 알림까지" hint="입력이 멈추고 이 시간이 지나면 알립니다. 10~86400초.">
        <Seconds value={alert.idleSeconds} onCommit={(text) => onChange('alert.idleSeconds', text)} />
      </Field>
      <Field inline label="반복 간격" hint="다시 입력할 때까지 이 간격으로 반복합니다. 10~86400초.">
        <Seconds value={alert.repeatSeconds} onCommit={(text) => onChange('alert.repeatSeconds', text)} />
      </Field>
      <Field label="소리">
        <RadioGroup
          name="alert-sound"
          value={sound.kind === 'builtin' ? sound.name : null}
          options={SOUND_OPTIONS}
          onChange={(name) => onChange('alert.sound', { kind: 'builtin', name })}
        />
        <div className="flex items-center gap-2">
          <Button onClick={pickFile}>파일 선택…</Button>
          {sound.kind === 'file' && <span className="min-w-0 flex-1 truncate text-fg">{fileNameOf(sound.path)}</span>}
          <Button className="ml-auto" onClick={() => onPreview(sound)}>
            미리 듣기
          </Button>
        </div>
      </Field>
    </Section>
  )
}
