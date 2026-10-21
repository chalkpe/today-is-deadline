import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLogger, describeError, formatLogLine } from './index'

const AT = new Date(Date.UTC(2026, 9, 22, 1, 2, 3, 4))

describe('formatLogLine', () => {
  it('[ISO 시각] [레벨] 메시지', () => {
    expect(formatLogLine(AT, 'info', 'permission: denied')).toBe('[2026-10-22T01:02:03.004Z] [info] permission: denied')
  })

  it('줄바꿈은 한 줄로 접는다', () => {
    expect(formatLogLine(AT, 'error', 'a\nb\r\nc')).toBe('[2026-10-22T01:02:03.004Z] [error] a b c')
  })
})

describe('describeError', () => {
  it('Error는 메시지, 그 밖의 값은 문자열', () => {
    expect(describeError(new Error('탭을 만들 수 없습니다'))).toBe('탭을 만들 수 없습니다')
    expect(describeError('문자열')).toBe('문자열')
    expect(describeError(42)).toBe('42')
  })
})

describe('createLogger', () => {
  let dir: string
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-'))
  })
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('없는 디렉터리를 만들고 한 줄씩 덧붙인다', () => {
    const file = path.join(dir, 'logs', 'main.log')
    const echo = vi.fn()
    const log = createLogger(file, { now: () => AT, echo })
    log.info('시작')
    log.warn('경고')
    log.error('카운터 오류', new Error('디스크 가득'))
    const lines = [
      '[2026-10-22T01:02:03.004Z] [info] 시작',
      '[2026-10-22T01:02:03.004Z] [warn] 경고',
      '[2026-10-22T01:02:03.004Z] [error] 카운터 오류: 디스크 가득',
    ]
    expect(fs.readFileSync(file, 'utf8')).toBe(`${lines.join('\n')}\n`)
    expect(echo.mock.calls.map((c) => c[0])).toEqual(lines)
  })

  it('쓰기에 실패해도 던지지 않는다', () => {
    const blocker = path.join(dir, 'file')
    fs.writeFileSync(blocker, '')
    const log = createLogger(path.join(blocker, 'main.log'), { now: () => AT })
    expect(() => log.info('무시')).not.toThrow()
  })
})
