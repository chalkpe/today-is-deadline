import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadNativeHook, resolveNativeDir } from './index'

const repoNativeDir = fileURLToPath(new URL('../../../../native', import.meta.url))
const hasBuiltAddon = existsSync(repoNativeDir) && readdirSync(repoNativeDir).some((file) => file.endsWith('.node'))

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
})
