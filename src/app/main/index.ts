import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    // electron-vite는 "type": "module"이면 preload를 ESM(.mjs)으로 내보내고, ESM preload는 샌드박스에서 돌지 않는다.
    webPreferences: { preload: join(import.meta.dirname, '../preload/index.mjs'), sandbox: false },
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  if (!app.isPackaged && rendererUrl) mainWindow.loadURL(rendererUrl)
  else mainWindow.loadFile(join(import.meta.dirname, '../renderer/index.html'))
}

app.whenReady().then(createWindow)
