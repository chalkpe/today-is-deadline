import { AppIcon } from '@renderer/shared/ui/AppIcon'
import { Button } from '@renderer/shared/ui/Button'
import { Field } from '@renderer/shared/ui/Field'
import { Section } from '@renderer/shared/ui/Section'
import { Toggle } from '@renderer/shared/ui/Toggle'
import type { Settings } from '@shared/model/settings'
import type { KnownApp } from '@shared/model/stats'
import { cn } from 'cn'
import { toggleIncluded } from '../model/form'
import { useKnownApps } from '../model/useKnownApps'
import type { ChangeField } from '../model/useSettingsForm'

type Props = { filter: Settings['filter']; errors?: readonly string[]; onChange: ChangeField }

/** 켜면 지금까지 집계된 앱을 격자로 보여 주고, 칸을 눌러 포함·제외를 바꾼다. */
export function FilterSection({ filter, errors, onChange }: Props) {
  const apps = useKnownApps(filter.enabled)
  return (
    <Section heading="앱 필터" description="켜면 포함한 앱의 타수만 히트맵과 통계에 보입니다. 가감은 그대로 더합니다." errors={errors}>
      <Toggle label="필터 켜기" checked={filter.enabled} onChange={(checked) => onChange('filter.enabled', checked)} />
      {filter.enabled && apps && <AppPicker apps={apps} included={filter.included} onChange={onChange} />}
    </Section>
  )
}

type PickerProps = { apps: KnownApp[]; included: readonly string[]; onChange: ChangeField }

function AppPicker({ apps, included, onChange }: PickerProps) {
  const on = new Set(included)
  const count = apps.filter((app) => on.has(app.appId)).length
  const all = apps.map((app) => app.appId)
  return (
    <div className="flex flex-col gap-3">
      <Field inline label={`포함 ${count}개 · 제외 ${apps.length - count}개`} hint="새로 집계되는 앱은 제외된 채로 추가됩니다.">
        <div className="flex gap-1.5">
          <Button size="sm" disabled={count === apps.length} onClick={() => onChange('filter.included', all)}>
            모두 포함
          </Button>
          <Button size="sm" disabled={count === 0} onClick={() => onChange('filter.included', [])}>
            모두 제외
          </Button>
        </div>
      </Field>
      {apps.length === 0 ? (
        <p className="text-fg-muted">아직 집계된 앱이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-1.5">
          {apps.map((app) => (
            <AppTile
              key={app.appId}
              app={app}
              included={on.has(app.appId)}
              onClick={() => onChange('filter.included', toggleIncluded(included, app.appId))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type TileProps = { app: KnownApp; included: boolean; onClick(): void }

/** 포함: 초록 테두리·옅은 초록 바탕·체크. 제외: 회색 글씨와 흐린 흑백 아이콘. */
function AppTile({ app, included, onClick }: TileProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-8 min-w-0 items-center gap-2 rounded-md border px-2 text-left transition-colors',
        included ? 'border-emerald-500 bg-emerald-500/10 text-fg' : 'border-control-border text-fg-muted hover:bg-cell-empty',
      )}
      onClick={onClick}
    >
      <AppIcon appId={app.appId} className={cn('size-4', !included && 'opacity-40 grayscale')} />
      <span className="min-w-0 flex-1 truncate">{app.name}</span>
      {included && <CheckIcon />}
    </button>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400"
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  )
}
