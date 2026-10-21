import type { Logger } from '@main/shared/log'
import type { PermissionStatus } from '@shared/ipc'
import type { Settings } from '@shared/model/settings'
import type { Counter } from './counter'

export type CountingSession = {
  /** 권한·설정에 맞춰 카운터를 켜거나 끈다. 시작 시와 설정 변경 때 부른다. */
  sync(): void
  /** renderer에 보여 줄 권한 상태. 훅 시작에 실패하면 OS 상태와 무관하게 denied다. */
  status(): PermissionStatus
  dispose(): void
}

type Deps = {
  counter: Pick<Counter, 'start' | 'stop' | 'isRunning'>
  permissionStatus: () => PermissionStatus
  /** OS 권한 요청. macOS는 입력 모니터링 목록에 앱을 올린다. */
  requestPermission: () => void
  settings: { get(): Settings }
  log: Pick<Logger, 'info' | 'error'>
  onStatus: (status: PermissionStatus) => void
  onRunning: (running: boolean) => void
  pollMs?: number
}

export function createCountingSession({
  counter,
  permissionStatus,
  requestPermission,
  settings,
  log,
  onStatus,
  onRunning,
  pollMs = 2000,
}: Deps): CountingSession {
  let status: PermissionStatus | null = null
  let running = counter.isRunning()
  let startFailed = false
  let requested = false
  let poll: ReturnType<typeof setInterval> | undefined

  const readStatus = (): PermissionStatus => {
    try {
      return permissionStatus()
    } catch {
      return 'denied'
    }
  }

  const tryStart = (): boolean => {
    try {
      counter.start()
      startFailed = false
      return true
    } catch (err) {
      // 탭 생성 실패(권한 거부 등)는 2초마다 재시도하므로 연속 실패는 처음 한 번만 기록한다
      if (!startFailed) log.error('counting: start failed', err)
      startFailed = true
      return false
    }
  }

  // 스펙 8.6: 처음 거부를 보면 한 번만 요청해 입력 모니터링 목록에 앱을 등록시킨다. 재확인마다 부르지 않는다.
  const requestOnce = () => {
    if (requested) return
    requested = true
    try {
      requestPermission()
      log.info('permission: requested')
    } catch (err) {
      log.error('permission: request failed', err)
    }
  }

  const setStatus = (next: PermissionStatus) => {
    if (next === status) return
    status = next
    log.info(`permission: ${next}`)
    onStatus(next)
  }

  const noteRunning = () => {
    const now = counter.isRunning()
    if (now === running) return
    running = now
    log.info(now ? 'counting: started' : 'counting: stopped')
    onRunning(now)
  }

  const setPolling = (on: boolean) => {
    if (on && poll === undefined) {
      poll = setInterval(() => {
        try {
          sync()
        } catch (err) {
          log.error('counting: sync failed', err)
        }
      }, pollMs)
    } else if (!on && poll !== undefined) {
      clearInterval(poll)
      poll = undefined
    }
  }

  function sync() {
    const native = readStatus()
    if (native === 'denied') requestOnce()
    let effective = native
    if (!settings.get().counting.enabled) {
      startFailed = false
      if (counter.isRunning()) counter.stop()
    } else if (native !== 'denied' && !counter.isRunning() && !tryStart()) {
      effective = 'denied'
    }
    setStatus(effective)
    noteRunning()
    // 거부 상태에서는 허용될 때까지 2초마다 다시 확인한다
    setPolling(effective === 'denied')
  }

  return {
    sync,
    status: () => status ?? readStatus(),
    dispose: () => setPolling(false),
  }
}
