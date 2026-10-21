import type { MenuItemConstructorOptions } from 'electron'

export type TrayState = { counting: boolean; alert: boolean; widgetVisible: boolean; locked: boolean }
export type TrayActions = {
  toggleCounting(): void
  toggleAlert(): void
  toggleWidget(): void
  toggleLock(): void
  openStats(): void
  openAdjust(): void
  openSettings(): void
  quit(): void
}

export function buildTrayMenu(state: TrayState, actions: TrayActions): MenuItemConstructorOptions[] {
  return [
    { label: '카운트', type: 'checkbox', checked: state.counting, click: () => actions.toggleCounting() },
    { label: '알림', type: 'checkbox', checked: state.alert, click: () => actions.toggleAlert() },
    { label: '위젯 표시', type: 'checkbox', checked: state.widgetVisible, click: () => actions.toggleWidget() },
    { label: '위치 잠금', type: 'checkbox', checked: state.locked, click: () => actions.toggleLock() },
    { type: 'separator' },
    { label: '통계…', click: () => actions.openStats() },
    { label: '가감…', click: () => actions.openAdjust() },
    { label: '설정…', click: () => actions.openSettings() },
    { type: 'separator' },
    { label: '종료', click: () => actions.quit() },
  ]
}
