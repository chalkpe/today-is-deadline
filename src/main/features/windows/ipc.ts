import { type Handlers, requireDateKey } from '@main/shared/ipc'
import { CHANNELS } from '@shared/ipc'
import type { SecondaryKind } from './page'

type WindowActions = {
  resizeWidget(request: unknown): void
  openSecondary(kind: SecondaryKind, route?: string): void
}

export function windowHandlers(windows: WindowActions) {
  return {
    [CHANNELS.WIDGET_RESIZE]: (request) => {
      windows.resizeWidget(request)
    },
    [CHANNELS.WIDGET_OPEN_STATS]: (input) => {
      const { date } = (input ?? {}) as Record<string, unknown>
      windows.openSecondary('stats', date === undefined ? undefined : `/stats?date=${requireDateKey(date)}`)
    },
    [CHANNELS.WIDGET_OPEN_SETTINGS]: () => {
      windows.openSecondary('settings')
    },
  } satisfies Handlers<'widget:resize' | 'widget:openStats' | 'widget:openSettings'>
}
