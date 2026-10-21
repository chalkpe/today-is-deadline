import { ColorInput } from '@renderer/shared/ui/ColorInput'
import { Field } from '@renderer/shared/ui/Field'
import { NumberInput } from '@renderer/shared/ui/NumberInput'
import { RadioGroup } from '@renderer/shared/ui/RadioGroup'
import { Section } from '@renderer/shared/ui/Section'
import { Toggle } from '@renderer/shared/ui/Toggle'
import type { HeatmapMode, Settings } from '@shared/model/settings'
import { cn } from 'cn'
import type { ChangeField } from '../model/useSettingsForm'

type Props = { heatmap: Settings['heatmap']; errors?: readonly string[]; onChange: ChangeField }

const MODES: readonly { value: HeatmapMode; label: string }[] = [
  { value: 'relative', label: '상대' },
  { value: 'fixed', label: '고정' },
]
const MODE_HINT: Record<HeatmapMode, string> = {
  relative: '보이는 기간에서 가장 많이 친 날을 가장 진하게 칠합니다.',
  fixed: '아래 임계값으로 색 단계를 나눕니다.',
}
const THRESHOLD_INDEXES = [0, 1, 2, 3] as const
const ELEMENTS = [
  { key: 'showTodayCount', label: '오늘 타수 숫자' },
  { key: 'showMonthLabels', label: '월 라벨' },
  { key: 'showDayLabels', label: '요일 라벨' },
  { key: 'showIcons', label: '잠금·설정 아이콘' },
] as const

export function HeatmapSection({ heatmap, errors, onChange }: Props) {
  const relative = heatmap.mode === 'relative'
  return (
    <Section heading="히트맵" errors={errors}>
      <Field inline label="기준색">
        <ColorInput value={heatmap.baseColor} onChange={(value) => onChange('heatmap.baseColor', value)} />
      </Field>
      <Field inline label="색 모드" hint={MODE_HINT[heatmap.mode]}>
        <RadioGroup name="heatmap-mode" value={heatmap.mode} options={MODES} onChange={(value) => onChange('heatmap.mode', value)} />
      </Field>
      {/* 상대 모드에서는 쓰이지 않지만 미리 고쳐 둘 수 있게 흐리게만 한다 */}
      <Field
        label="고정 임계값"
        hint="고정 모드에서 색 단계를 나누는 타수입니다. 작은 값부터 차례로 입력하세요."
        className={cn(relative && 'opacity-60')}
      >
        <div className="flex flex-wrap gap-1.5">
          {THRESHOLD_INDEXES.map((i) => (
            <NumberInput
              key={i}
              value={heatmap.fixedThresholds[i]}
              min={1}
              step={100}
              onCommit={(text) => onChange(`heatmap.fixedThresholds.${i}`, text)}
            />
          ))}
        </div>
      </Field>
      {ELEMENTS.map(({ key, label }) => (
        <Toggle key={key} label={label} checked={heatmap[key]} onChange={(checked) => onChange(`heatmap.${key}`, checked)} />
      ))}
    </Section>
  )
}
