import type { Logger } from '@main/shared/log'
import { debounce } from '@main/shared/timing'
import type { Settings } from '@shared/model/settings'
import { app, screen } from 'electron'
import type { RendererSource, SecondaryKind } from './page'
import { placeResized, resizeTarget } from './resize'
import { createSecondaryWindows } from './secondary'
import { applyLock, createWidgetWindow } from './widget'

export * from './bounds'
export { broadcast } from './broadcast'
export { windowHandlers } from './ipc'
export type { RendererSource, SecondaryKind } from './page'

type Deps = {
  settings: {
    get(): Settings
    update(patch: (s: Settings) => Settings): void
    onChange(listener: (next: Settings, prev: Settings) => void): () => void
  }
  preload: string
  source: RendererSource
  log: Pick<Logger, 'error'>
  /** 시작할 때의 권한 거부 여부. 위젯 창의 첫 높이를 정한다. */
  permissionDenied: boolean
}

export type Windows = {
  showWidget(): void
  resizeWidget(request: unknown): void
  openSecondary(kind: SecondaryKind, route?: string): void
  /** before-quit에서 부른다. 위젯을 실제로 닫을 수 있게 하고 미뤄 둔 위치·크기 저장을 마친다. */
  prepareQuit(): void
}

/** 위젯 창을 만들고, 설정(잠금·표시 여부)과 창 상태(위치·너비)를 서로 맞춘다. */
export function createWindows({ settings, preload, source, log, permissionDenied }: Deps): Windows {
  let quitting = false
  const onLoadError = (err: unknown) => log.error('window: load failed', err)
  const setVisible = (visible: boolean) => settings.update((s) => ({ ...s, widget: { ...s.widget, visible } }))

  const widget = createWidgetWindow(settings.get(), { preload, source, onLoadError, permissionDenied }, (win) => {
    if (settings.get().widget.visible) win.showInactive()
  })
  const secondary = createSecondaryWindows({ settings, preload, source, onLoadError })

  // 이동·너비 변경은 끝난 뒤 300ms 동안 조용하면 한 번만 저장한다
  const savePosition = debounce(() => {
    if (widget.isDestroyed()) return
    const bounds = widget.getBounds()
    const displayId = screen.getDisplayMatching(bounds).id
    settings.update((s) => ({ ...s, widget: { ...s.widget, x: bounds.x, y: bounds.y, displayId } }))
  }, 300)
  const saveWidth = debounce(() => {
    if (widget.isDestroyed()) return
    const [width] = widget.getSize()
    settings.update((s) => ({ ...s, widget: { ...s.widget, width } }))
  }, 300)

  widget.on('move', savePosition.call)
  widget.on('close', (event) => {
    // 알림음 <audio>가 위젯 창에 있으므로 닫지 않고 숨긴다. 종료 중에만 실제로 닫는다.
    if (quitting) return
    event.preventDefault()
    setVisible(false)
  })

  settings.onChange((next, prev) => {
    if (widget.isDestroyed()) return
    if (next.widget.locked !== prev.widget.locked) applyLock(widget, next.widget.locked)
    if (next.widget.visible && !widget.isVisible()) widget.showInactive()
    else if (!next.widget.visible && widget.isVisible()) widget.hide()
  })

  // 트레이 앱이므로 창이 모두 닫혀도 종료하지 않는다(app.quit 중에는 이 이벤트가 오지 않는다)
  app.on('window-all-closed', () => {})

  return {
    showWidget: () => setVisible(true),
    resizeWidget(request) {
      if (widget.isDestroyed()) return
      const [width, height] = widget.getSize()
      const bounds = widget.getBounds()
      const area = screen.getDisplayMatching(bounds).workArea
      const next = resizeTarget({ width, height }, request, settings.get().widget.locked, area)
      if (!next) return
      // 화면 아래쪽에서 펼치면 아래 끝이 작업 영역을 넘지 않게 창을 올린다
      const placed = placeResized(bounds, next.height, area)
      if (placed.y !== bounds.y) {
        widget.setBounds({ x: placed.x, y: placed.y, width: next.width, height: next.height })
        savePosition.call()
      } else {
        widget.setSize(next.width, next.height)
      }
      if (next.width !== width) saveWidth.call()
    },
    openSecondary: secondary.open,
    prepareQuit() {
      quitting = true
      savePosition.flush()
      saveWidth.flush()
      secondary.flush()
    },
  }
}
