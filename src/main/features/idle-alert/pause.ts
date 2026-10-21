export type PowerSignal = 'suspend' | 'resume' | 'lock-screen' | 'unlock-screen'

/**
 * 절전과 화면 잠금을 하나의 '멈춤'으로 합친다. 둘 중 하나라도 걸려 있으면 멈춘 상태다.
 * 잠긴 채 잠들었다 깨면(resume) 아직 잠금 화면이므로 재개하지 않고, 잠금을 풀 때 재개한다.
 * 잠금 해제는 깨어 있다는 뜻이기도 하므로 절전 표시도 함께 지운다(resume를 놓쳐도 멈춘 채 남지 않게).
 */
export function createPauseTracker(handlers: { suspend(): void; resume(): void }): (signal: PowerSignal) => void {
  let asleep = false
  let locked = false
  return (signal) => {
    const wasPaused = asleep || locked
    if (signal === 'suspend') asleep = true
    else if (signal === 'resume') asleep = false
    else if (signal === 'lock-screen') locked = true
    else {
      locked = false
      asleep = false
    }
    const paused = asleep || locked
    if (paused && !wasPaused) handlers.suspend()
    else if (!paused && wasPaused) handlers.resume()
  }
}
