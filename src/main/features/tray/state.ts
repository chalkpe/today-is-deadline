import type { Settings } from '@shared/model/settings'
import type { TrayState } from './menu'

/** macOS는 메뉴 막대 템플릿 이미지, Windows는 ICO. 카운트가 실제로 돌지 않으면(꺼짐·권한 없음) 흐린 아이콘. */
export function trayIconFile(platform: NodeJS.Platform, active: boolean): string {
  if (platform === 'darwin') return active ? 'trayTemplate.png' : 'tray-offTemplate.png'
  return active ? 'tray.ico' : 'tray-off.ico'
}

export function trayState(s: Settings): TrayState {
  return { counting: s.counting.enabled, alert: s.alert.enabled, widgetVisible: s.widget.visible, locked: s.widget.locked }
}

export const toggleCounting = (s: Settings): Settings => ({ ...s, counting: { ...s.counting, enabled: !s.counting.enabled } })
export const toggleAlert = (s: Settings): Settings => ({ ...s, alert: { ...s.alert, enabled: !s.alert.enabled } })
export const toggleWidget = (s: Settings): Settings => ({ ...s, widget: { ...s.widget, visible: !s.widget.visible } })
export const toggleLock = (s: Settings): Settings => ({ ...s, widget: { ...s.widget, locked: !s.widget.locked } })
