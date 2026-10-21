import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadNativeHook, resolveNativeDir } from './index'

const repoNativeDir = fileURLToPath(new URL('../../../../native', import.meta.url))
const builderConfig = fileURLToPath(new URL('../../../../electron-builder.yml', import.meta.url))
const hasBuiltAddon = existsSync(repoNativeDir) && readdirSync(repoNativeDir).some((file) => file.endsWith('.node'))

/** electron-builder.yml에서 `from: native` 항목의 filter 목록을 읽는다. 이 파일의 들여쓰기 모양만 다루는 간단한 파서다. */
function nativeResourceFilter(): string[] {
  const lines = readFileSync(builderConfig, 'utf8').split(/\r?\n/)
  const from = lines.findIndex((line) => line.trim() === '- from: native')
  const filter = lines.findIndex((line, index) => index > from && line.trim() === 'filter:')
  expect(from).toBeGreaterThanOrEqual(0)
  expect(filter).toBeGreaterThan(from)
  const patterns: string[] = []
  for (const line of lines.slice(filter + 1)) {
    const item = /^\s+- '?([^']+?)'?$/.exec(line)
    if (!item) break
    patterns.push(item[1])
  }
  return patterns
}

/** filter의 파일 이름 패턴(`*`만 쓴다)에 맞는지. */
function matches(pattern: string, file: string): boolean {
  const source = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^/\\\\]*')
  return new RegExp(`^${source}$`).test(file)
}

describe('resolveNativeDir', () => {
  it('패키징된 앱은 resources 아래 native를 쓴다', () => {
    expect(resolveNativeDir({ isPackaged: true, resourcesPath: '/r', appPath: '/a' })).toBe(join('/r', 'native'))
  })

  it('개발 중에는 앱 경로 아래 native를 쓴다', () => {
    expect(resolveNativeDir({ isPackaged: false, resourcesPath: '/r', appPath: '/a' })).toBe(join('/a', 'native'))
  })
})

describe('loadNativeHook', () => {
  it('빌드된 애드온을 불러와 권한 상태를 문자열로 받는다', ({ skip }) => {
    skip(!hasBuiltAddon, 'native/*.node가 없다. pnpm native:build로 애드온을 먼저 빌드해야 이 테스트가 돈다.')
    const hook = loadNativeHook(repoNativeDir)
    expect(['granted', 'denied', 'not-required']).toContain(hook.permissionStatus())
  })

  // 저장소 안의 release/에서 패키징한 앱을 실행하면 resources/native 위에 "type": "module"인 저장소 package.json이 있다.
  // 패키징이 native의 package.json을 함께 넣지 않으면 로더(index.js)가 ES 모듈로 읽혀 시작에 실패한다(Windows 검증에서 발견).
  it('패키징이 넣는 native 파일만으로 상위 package.json이 ES 모듈이어도 애드온을 불러온다', ({ skip }) => {
    skip(!hasBuiltAddon, 'native/*.node가 없다. pnpm native:build로 애드온을 먼저 빌드해야 이 테스트가 돈다.')
    const root = mkdtempSync(join(tmpdir(), 'tid-packaged-'))
    try {
      writeFileSync(join(root, 'package.json'), '{ "type": "module" }')
      const resources = join(root, 'resources', 'native')
      mkdirSync(resources, { recursive: true })
      const patterns = nativeResourceFilter()
      for (const file of readdirSync(repoNativeDir)) {
        if (patterns.some((pattern) => matches(pattern, file))) copyFileSync(join(repoNativeDir, file), join(resources, file))
      }
      const hook = loadNativeHook(resources)
      expect(['granted', 'denied', 'not-required']).toContain(hook.permissionStatus())
    } finally {
      // Windows는 불러온 .node 파일을 프로세스가 끝날 때까지 잠그므로 지우지 못해도 넘어간다.
      try {
        rmSync(root, { recursive: true, force: true })
      } catch {}
    }
  })
})
