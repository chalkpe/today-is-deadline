import fs from 'node:fs'
import path from 'node:path'

// 키코드·키 이름 같은 입력 내용은 절대 기록하지 않는다. 앱 이름·식별자·개수·상태만 남긴다.

export type LogLevel = 'info' | 'warn' | 'error'

export type Logger = {
  info(message: string): void
  warn(message: string): void
  error(message: string, err?: unknown): void
}

export function formatLogLine(at: Date, level: LogLevel, message: string): string {
  return `[${at.toISOString()}] [${level}] ${message.replace(/\r?\n/g, ' ')}`
}

export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

type LoggerOptions = { now?: () => Date; echo?: (line: string) => void }

/** filePath에 한 줄씩 덧붙이는 로거. 쓰기 실패는 앱 동작에 영향을 주지 않도록 삼킨다. */
export function createLogger(filePath: string, { now = () => new Date(), echo }: LoggerOptions = {}): Logger {
  let dirReady = false
  const write = (level: LogLevel, message: string) => {
    const line = formatLogLine(now(), level, message)
    echo?.(line)
    try {
      if (!dirReady) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true })
        dirReady = true
      }
      fs.appendFileSync(filePath, `${line}\n`)
    } catch {
      // 로그를 못 남겨도 앱은 계속 돈다
    }
  }
  return {
    info: (message) => write('info', message),
    warn: (message) => write('warn', message),
    error: (message, err) => write('error', err === undefined ? message : `${message}: ${describeError(err)}`),
  }
}

type ProcessEvents = { on(event: 'uncaughtException' | 'unhandledRejection', listener: (err: unknown) => void): unknown }

/**
 * 처리되지 않은 예외·Promise 거부를 로그에 남기고 앱은 계속 돌게 한다(Electron 기본 오류 대화상자 대신).
 * 오류 메시지만 남기며 키 정보는 애초에 오류로 넘어오지 않는다.
 */
export function logUncaught(proc: ProcessEvents, log: Pick<Logger, 'error'>): void {
  const record = (label: string) => (err: unknown) => {
    try {
      log.error(label, err)
    } catch {
      // 처리기에서 다시 던지면 프로세스가 죽으므로 삼킨다
    }
  }
  proc.on('uncaughtException', record('uncaught exception'))
  proc.on('unhandledRejection', record('unhandled rejection'))
}

/** 시작 실패 대화상자 문구. 원인과 로그 파일 위치를 알려 준다. */
export function startFailureMessage(err: unknown, logPath: string): string {
  return `앱을 시작하지 못했습니다.\n${describeError(err)}\n\n자세한 내용은 로그 파일을 확인해 주세요.\n${logPath}`
}
