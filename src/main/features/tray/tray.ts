import { join } from 'node:path'
import type { Settings } from '@shared/model/settings'
import { app, Menu, nativeImage, Tray } from 'electron'
import { buildTrayMenu, type TrayActions } from './menu'
import { toggleAlert, toggleCounting, toggleLock, toggleWidget, trayIconFile, trayState } from './state'

type Deps = {
  iconsDir: string
  settings: { get(): Settings; update(patch: (s: Settings) => Settings): void; onChange(listener: () => void): () => void }
  /** 훅이 실제로 돌고 있는지(돌지 않으면 아이콘을 흐리게 한다) */
  counting: { isRunning(): boolean; onRunningChange(listener: () => void): () => void }
  open: (kind: 'stats' | 'adjust' | 'settings') => void
}

export type AppTray = { refresh(): void }

/** 트레이 아이콘과 메뉴. 설정이나 카운트 실행 상태가 바뀌면 아이콘과 메뉴를 다시 만든다. */
export function createTray({ iconsDir, settings, counting, open }: Deps): AppTray {
  const icon = (active: boolean) => nativeImage.createFromPath(join(iconsDir, trayIconFile(process.platform, active)))
  const icons = { on: icon(true), off: icon(false) }
  const tray = new Tray(counting.isRunning() ? icons.on : icons.off)
  // Windows는 왼쪽 클릭에 메뉴가 뜨지 않으므로 직접 띄운다(macOS는 클릭하면 메뉴가 열린다)
  if (process.platform === 'win32') tray.on('click', () => tray.popUpContextMenu())

  // 체크 항목은 설정만 바꾸고, 실제 반영(훅·창·알림)은 설정 onChange 쪽에서 한다
  const actions: TrayActions = {
    toggleCounting: () => settings.update(toggleCounting),
    toggleAlert: () => settings.update(toggleAlert),
    toggleWidget: () => settings.update(toggleWidget),
    toggleLock: () => settings.update(toggleLock),
    openStats: () => open('stats'),
    openAdjust: () => open('adjust'),
    openSettings: () => open('settings'),
    // 정리(훅 정지·flush·DB 닫기)는 before-quit에서 한다
    quit: () => app.quit(),
  }

  const refresh = () => {
    tray.setImage(counting.isRunning() ? icons.on : icons.off)
    tray.setContextMenu(Menu.buildFromTemplate(buildTrayMenu(trayState(settings.get()), actions)))
  }
  refresh()
  settings.onChange(refresh)
  counting.onRunningChange(refresh)
  return { refresh }
}
