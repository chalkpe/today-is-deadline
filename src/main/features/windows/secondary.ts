import { debounce } from '@main/shared/timing'
import type { Settings } from '@shared/model/settings'
import { app, BrowserWindow } from 'electron'
import { loadRoute, type RendererSource, type SecondaryKind, webPreferences } from './page'

type Size = { width: number; height: number }

const MIN_SIZE: Record<SecondaryKind, Size> = {
  stats: { width: 560, height: 480 },
  settings: { width: 420, height: 400 },
  adjust: { width: 400, height: 360 },
}
const DEFAULT_SIZE: Record<'settings' | 'adjust', Size> = {
  settings: { width: 520, height: 680 },
  adjust: { width: 480, height: 600 },
}

type Deps = {
  settings: { get(): Settings; update(patch: (s: Settings) => Settings): void }
  preload: string
  source: RendererSource
  onLoadError: (err: unknown) => void
}

export type SecondaryWindows = {
  /** 종류별로 한 창만 둔다. 이미 열려 있으면 앞으로 가져오고, route가 있으면 그 경로로 옮긴다. */
  open(kind: SecondaryKind, route?: string): void
  /** 미뤄 둔 통계 창 크기 저장을 지금 한다. */
  flush(): void
}

export function createSecondaryWindows({ settings, preload, source, onLoadError }: Deps): SecondaryWindows {
  const windows = new Map<SecondaryKind, BrowserWindow>()
  let statsSize: Size | null = null
  const saveStatsSize = debounce(() => {
    const size = statsSize
    if (size) settings.update((s) => ({ ...s, stats: size }))
  }, 300)

  const focus = (win: BrowserWindow) => {
    // Dock을 숨긴(accessory) 앱은 창만 뜨고 앞으로 오지 않을 수 있어 앱을 먼저 활성화한다
    if (process.platform === 'darwin') app.focus({ steal: true })
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }

  const initialSize = (kind: SecondaryKind): Size => {
    if (kind !== 'stats') return DEFAULT_SIZE[kind]
    const { width, height } = settings.get().stats
    return { width: Math.max(MIN_SIZE.stats.width, Math.round(width)), height: Math.max(MIN_SIZE.stats.height, Math.round(height)) }
  }

  const create = (kind: SecondaryKind, route: string) => {
    const win = new BrowserWindow({
      ...initialSize(kind),
      minWidth: MIN_SIZE[kind].width,
      minHeight: MIN_SIZE[kind].height,
      show: false,
      fullscreenable: false,
      webPreferences: webPreferences(preload),
    })
    win.once('ready-to-show', () => focus(win))
    if (kind === 'stats') {
      win.on('resize', () => {
        const [width, height] = win.getSize()
        statsSize = { width, height }
        saveStatsSize.call()
      })
    }
    win.on('closed', () => windows.delete(kind))
    windows.set(kind, win)
    loadRoute(win, source, route).catch(onLoadError)
  }

  return {
    open(kind, route) {
      const existing = windows.get(kind)
      if (!existing || existing.isDestroyed()) return create(kind, route ?? `/${kind}`)
      // 같은 문서 안의 해시 이동이므로 renderer는 hashchange로 받는다
      if (route !== undefined) loadRoute(existing, source, route).catch(onLoadError)
      focus(existing)
    },
    flush: () => saveStatsSize.flush(),
  }
}
