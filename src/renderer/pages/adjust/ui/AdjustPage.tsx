import { AdjustForm } from '@renderer/features/adjust-form'
import { api, usePush } from '@renderer/shared/lib/ipc'
import { Page } from '@renderer/shared/ui/Page'
import { Section } from '@renderer/shared/ui/Section'
import type { Adjustment } from '@shared/model/stats'
import { useEffect, useState } from 'react'
import { AdjustList } from './AdjustList'

export function AdjustPage() {
  const [items, setItems] = useState<Adjustment[] | null>(null)
  useEffect(() => {
    let alive = true
    api.invoke('adjust:list').then((list) => {
      // 조회보다 푸시가 먼저 왔으면 푸시가 더 최신이다
      if (alive) setItems((prev) => prev ?? list)
    })
    return () => {
      alive = false
    }
  }, [])
  usePush('push:adjustments', setItems)

  return (
    <Page windowTitle="가감">
      <Section heading="가감 추가" description="고른 날짜의 총 타수에 더하거나 뺍니다. 앱별·시간별 기록에는 들어가지 않습니다.">
        <AdjustForm />
      </Section>
      <Section heading="조정 내역">{items && <AdjustList items={items} onRemove={(id) => api.invoke('adjust:remove', id)} />}</Section>
    </Page>
  )
}
