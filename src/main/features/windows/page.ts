import type { BrowserWindow, WebPreferences } from 'electron'

export type SecondaryKind = 'stats' | 'settings' | 'adjust'

/** 개발 중에는 Vite 개발 서버 URL, 패키징 뒤에는 out/renderer/index.html */
export type RendererSource = { url: string } | { file: string }

/** 모든 창이 같은 renderer를 해시 경로(#/widget, #/stats …)로 나눠 쓴다. */
export function loadRoute(win: BrowserWindow, source: RendererSource, route: string): Promise<void> {
  return 'url' in source ? win.loadURL(`${source.url}#${route}`) : win.loadFile(source.file, { hash: route })
}

export function webPreferences(preload: string): WebPreferences {
  return { preload, contextIsolation: true, nodeIntegration: false, sandbox: true }
}
