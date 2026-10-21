import { AlertAudio } from '@renderer/features/alert-audio'
import { ResizeHandle } from '@renderer/features/resize-handle'
import { WIDGET_BACKGROUND } from '@renderer/shared/lib/color'
import { api } from '@renderer/shared/lib/ipc'
import { DRAG_REGION, NO_DRAG_BUTTONS, NO_DRAG_REGION } from '@renderer/shared/ui/region'
import { DayDetail, Footer, HeatmapGrid, PermissionNotice } from '@renderer/widgets/heatmap-panel'
import { FOOTER_HEIGHT, PANEL_BORDER, PANEL_PADDING } from '@shared/model/layout'
import { cn } from 'cn'
import { maxWidgetWidth, useWidgetData, type WidgetData } from '../model/useWidgetData'
import { PanelIcons } from './PanelIcons'

const PANEL_BACKGROUND = `color-mix(in srgb, ${WIDGET_BACKGROUND} 92%, transparent)`

export function WidgetPage() {
  const data = useWidgetData()
  return (
    <>
      {/* 설정을 받기 전에도 알림음은 울릴 수 있어야 한다 */}
      <AlertAudio />
      {data && <Panel data={data} />}
    </>
  )
}

function Panel({ data }: { data: WidgetData }) {
  const { settings, denied, today, todayKey, columns, selected, select, detail, height } = data
  const { baseColor, showDayLabels, showMonthLabels, showTodayCount, showIcons } = settings.heatmap
  const { locked } = settings.widget

  const toggleLock = async () => {
    // 위치 저장 등으로 바뀐 최신 설정 위에 잠금만 뒤집는다
    const latest = await api.invoke('settings:get')
    await api.invoke('settings:set', { ...latest, widget: { ...latest.widget, locked: !locked } })
  }

  return (
    // 높이는 main에 보낸 widgetHeight와 같다. 테두리는 PANEL_PADDING 안에 포함한다.
    <div
      className={cn(
        'group fixed inset-x-0 top-0 flex cursor-default select-none flex-col overflow-hidden rounded-lg border border-white/10',
        // Esc 같은 키 입력 뒤 마지막으로 누른 셀·버튼에 브라우저 포커스 링이 뜨지 않게 한다(선택 윤곽선은 인라인 스타일이라 남는다)
        '[&_button:focus-visible]:outline-none',
        !locked && DRAG_REGION,
      )}
      style={{ height, padding: PANEL_PADDING - PANEL_BORDER, background: PANEL_BACKGROUND }}
    >
      {denied ? (
        <div className={cn('min-h-0 flex-1', NO_DRAG_BUTTONS)}>
          <PermissionNotice
            onOpenSettings={() => api.invoke('permission:openSettings')}
            onRequest={() => api.invoke('permission:request')}
          />
        </div>
      ) : (
        <>
          {/* 셀만 끌기에서 빼서 월·요일 라벨 줄로도 창을 옮길 수 있게 한다 */}
          <div className={cn('shrink-0 self-start', NO_DRAG_BUTTONS)}>
            <HeatmapGrid
              columns={columns}
              baseColor={baseColor}
              showDayLabels={showDayLabels}
              showMonthLabels={showMonthLabels}
              selected={selected}
              onSelect={select}
            />
          </div>
          {detail && (
            // 격자 밖(내역) 클릭은 펼침을 닫는다
            <div className={cn('shrink-0', NO_DRAG_REGION)} onClick={() => select(null)}>
              <DayDetail detail={detail} />
            </div>
          )}
          {showTodayCount && (
            <div className={cn('min-w-0 max-w-full shrink-0 self-start', NO_DRAG_REGION)} style={{ height: FOOTER_HEIGHT }}>
              {today && <Footer today={today} onClick={() => api.invoke('widget:openStats', { date: todayKey })} />}
            </div>
          )}
        </>
      )}
      {showIcons && <PanelIcons locked={locked} onToggleLock={toggleLock} onOpenSettings={() => api.invoke('widget:openSettings')} />}
      {!locked && <ResizeHandle maxWidth={maxWidgetWidth(showDayLabels)} />}
    </div>
  )
}
