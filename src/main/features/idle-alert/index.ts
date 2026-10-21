import type { Broadcast } from '@main/shared/ipc'
import type { Logger } from '@main/shared/log'
import { PUSH } from '@shared/ipc'
import type { Settings, SoundSetting } from '@shared/model/settings'
import { type AlertController, createAlertController } from './controller'
import { watchPower } from './power'

export { type AlertController, createAlertController } from './controller'
export { createIdleAlert, type IdleAlert, type IdleAlertDeps } from './driver'
export { watchPower } from './power'
export { type AlertEffect, type AlertEvent, type AlertState, reduceAlert } from './reducer'

type Deps = {
  settings: { get(): Settings; onChange(listener: () => void): () => void }
  counting: {
    isRunning(): boolean
    onKeydown(listener: () => void): () => void
    onRunningChange(listener: () => void): () => void
  }
  soundUrl: (sound: SoundSetting) => string
  send: Broadcast
  log: Pick<Logger, 'info'>
}

/** 유휴 알림을 만들고 키다운·설정 변경·카운트 실행 변화·절전/잠금에 연결한다. 처음 enable은 호출 측이 sync()로 한다. */
export function startIdleAlert({ settings, counting, soundUrl, send, log }: Deps): AlertController {
  const alert = createAlertController({
    settings,
    isCounting: counting.isRunning,
    soundUrl,
    send: (payload) => send(PUSH.ALERT, payload),
    log,
  })
  counting.onKeydown(() => alert.dispatch('keydown'))
  counting.onRunningChange(() => alert.sync())
  settings.onChange(() => alert.sync())
  watchPower({ suspend: () => alert.dispatch('suspend'), resume: () => alert.dispatch('resume') })
  return alert
}
