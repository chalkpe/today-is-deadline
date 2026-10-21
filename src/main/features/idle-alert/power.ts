import { powerMonitor } from 'electron'
import { createPauseTracker } from './pause'

/** 절전·화면 잠금 중 하나라도 걸리면 suspend, 둘 다 풀리면 resume으로 알린다. */
export function watchPower(handlers: { suspend(): void; resume(): void }): void {
  const signal = createPauseTracker(handlers)
  powerMonitor.on('suspend', () => signal('suspend'))
  powerMonitor.on('lock-screen', () => signal('lock-screen'))
  powerMonitor.on('resume', () => signal('resume'))
  powerMonitor.on('unlock-screen', () => signal('unlock-screen'))
}
