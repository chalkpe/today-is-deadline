import { powerMonitor } from 'electron'

/** 절전·화면 잠금은 suspend, 복귀·잠금 해제는 resume으로 묶어 알린다. */
export function watchPower(handlers: { suspend(): void; resume(): void }): void {
  powerMonitor.on('suspend', () => handlers.suspend())
  powerMonitor.on('lock-screen', () => handlers.suspend())
  powerMonitor.on('resume', () => handlers.resume())
  powerMonitor.on('unlock-screen', () => handlers.resume())
}
