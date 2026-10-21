import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { adjustmentHandlers } from '@main/features/adjustments'
import { countingHandlers, createCounting } from '@main/features/counting'
import { startIdleAlert } from '@main/features/idle-alert'
import { createSettingsStore, publishSettings, settingsHandlers } from '@main/features/settings'
import { registerSoundScheme, serveSounds, soundHandlers, soundUrlFor } from '@main/features/sound'
import { createTodayPusher, statsHandlers } from '@main/features/stats'
import { createTray } from '@main/features/tray'
import { broadcast, createWindows, type RendererSource, windowHandlers } from '@main/features/windows'
import { openDb } from '@main/shared/db'
import { registerHandlers } from '@main/shared/ipc'
import { createLogger } from '@main/shared/log'
import { loadNativeHook, resolveNativeDir } from '@main/shared/native'
import { app, ipcMain } from 'electron'

// 의존성을 만들고 연결만 한다. 각 기능이 반응할 이벤트는 기능 안에서 구독한다.
registerSoundScheme() // app.whenReady() 전에 등록해야 한다
const log = createLogger(join(app.getPath('userData'), 'logs', 'main.log'), { echo: app.isPackaged ? undefined : console.log })

if (!app.requestSingleInstanceLock()) app.quit()
else app.whenReady().then(start).catch(fail)

function start(): void {
  const dataDir = app.getPath('userData')
  const resources = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  const now = () => new Date()
  const nativeDir = resolveNativeDir({ isPackaged: app.isPackaged, resourcesPath: process.resourcesPath, appPath: app.getAppPath() })
  log.info(`start: ${app.getVersion()} ${process.platform}`)

  // 스펙 12절 순서: 설정 → DB → 트레이 → 위젯 창 → 권한 확인 → 훅 시작 → 알림 enable
  const settings = createSettingsStore({ filePath: join(dataDir, 'settings.json'), fileExists: existsSync })
  const db = openDb(join(dataDir, 'data.sqlite'))
  const counting = createCounting({ hook: loadNativeHook(nativeDir), db, settings, log, send: broadcast })
  app.dock?.hide()
  createTray({ iconsDir: join(resources, 'icons'), settings, counting, open: (kind) => windows.openSecondary(kind) })
  const windows = createWindows({ settings, preload: join(import.meta.dirname, '../preload/index.cjs'), source: rendererSource(), log })
  const today = createTodayPusher({ db, now, send: broadcast, log })
  const alert = startIdleAlert({ settings, counting, soundUrl: soundUrlFor, send: broadcast, log })
  publishSettings(settings, broadcast)
  counting.onTodayChanged(today.push)
  serveSounds({ soundsDir: join(resources, 'sounds'), getSound: () => settings.get().alert.sound })

  // 모든 채널을 한 번에 등록한다(빠진 채널은 컴파일 오류). start()가 끝나야 renderer의 invoke가 처리되므로 시점은 안전하다.
  registerHandlers(ipcMain, {
    ...settingsHandlers(settings),
    ...statsHandlers({ db, now }),
    ...adjustmentHandlers({ db, now, send: broadcast, pushToday: today.pushNow }),
    ...countingHandlers(counting),
    ...windowHandlers(windows),
    ...soundHandlers(),
  })

  app.on('second-instance', windows.showWidget)
  app.once('before-quit', () => {
    windows.prepareQuit()
    alert.dispatch('disable')
    counting.stop() // 훅을 멈추고 남은 카운트를 flush한다
    today.cancel()
    db.close()
    log.info('quit')
  })

  counting.sync() // 권한 확인 → 훅 시작
  alert.sync()
}

function rendererSource(): RendererSource {
  const url = process.env.ELECTRON_RENDERER_URL
  return !app.isPackaged && url ? { url } : { file: join(import.meta.dirname, '../renderer/index.html') }
}

function fail(err: unknown): void {
  log.error('start failed', err)
  // 위젯 창이 닫기를 막고 있을 수 있으므로 quit 대신 바로 끝낸다
  app.exit(1)
}
