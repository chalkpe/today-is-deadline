import type { Logger } from '@main/shared/log'
import type { IPush } from '@shared/ipc'
import type { Settings, SoundSetting } from '@shared/model/settings'
import { createIdleAlert } from './driver'
import type { AlertEvent, AlertState } from './reducer'

export type AlertController = {
  /** 설정·카운트 상태에 맞춰 enable/disable을 보낸다. 시작 시와 설정·실행 상태가 바뀔 때 부른다. */
  sync(): void
  dispatch(event: AlertEvent): void
  state(): AlertState
}

type Deps = {
  settings: { get(): Settings }
  /** 훅이 실제로 돌고 있는지. 권한이 없어 키다운이 올 수 없으면 알림이 멈출 수 없으므로 끈다. */
  isCounting: () => boolean
  soundUrl: (sound: SoundSetting) => string
  send: (payload: IPush['push:alert']) => void
  log: Pick<Logger, 'info'>
}

export function createAlertController({ settings, isCounting, soundUrl, send, log }: Deps): AlertController {
  const alert = createIdleAlert({
    getTimes: () => {
      const { idleSeconds, repeatSeconds } = settings.get().alert
      return { idleMs: idleSeconds * 1000, repeatMs: repeatSeconds * 1000 }
    },
    play: () => {
      const url = soundUrl(settings.get().alert.sound)
      log.info(`push:alert play ${url}`)
      send({ action: 'play', url })
    },
    stop: () => {
      log.info('push:alert stop')
      send({ action: 'stop' })
    },
    setTimeout,
    clearTimeout,
  })

  return {
    sync() {
      const s = settings.get()
      alert.dispatch(s.alert.enabled && s.counting.enabled && isCounting() ? 'enable' : 'disable')
    },
    dispatch: alert.dispatch,
    state: alert.state,
  }
}
