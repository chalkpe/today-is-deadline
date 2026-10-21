import type { Settings } from '@shared/model/settings'
import { BrowserWindow, screen } from 'electron'
import { loadRoute, type RendererSource, webPreferences } from './page'
import { widgetBounds } from './placement'

type Options = {
  preload: string
  source: RendererSource
  onLoadError: (err: unknown) => void
  /** 시작할 때 권한이 거부돼 있으면 첫 높이를 권한 안내 높이로 잡는다 */
  permissionDenied: boolean
}

/**
 * 항상 위에 뜨는 투명·프레임 없는 위젯 창(#/widget).
 * 사용자가 직접 크기를 바꾸지 못하게 resizable은 늘 false이고, 너비·높이는 widget:resize → setSize로만 바뀐다.
 */
export function createWidgetWindow(settings: Settings, options: Options, onReady: (win: BrowserWindow) => void): BrowserWindow {
  const displays = screen.getAllDisplays().map((d) => d.workArea)
  const win = new BrowserWindow({
    ...widgetBounds(settings, displays, screen.getPrimaryDisplay().workArea, options.permissionDenied),
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: webPreferences(options.preload),
  })
  if (process.platform === 'darwin') win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  applyLock(win, settings.widget.locked)
  win.once('ready-to-show', () => onReady(win))
  loadRoute(win, options.source, '/widget').catch(options.onLoadError)
  return win
}

/** 잠금은 창 이동을 막는다. 드래그 영역·리사이즈 핸들은 renderer가 PUSH.SETTINGS의 widget.locked를 보고 끈다. */
export function applyLock(win: BrowserWindow, locked: boolean): void {
  win.setMovable(!locked)
}
