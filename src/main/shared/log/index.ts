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
