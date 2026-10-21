import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { PermissionStatus } from '@shared/ipc'

export type { PermissionStatus } from '@shared/ipc'

export type AppIdentity = { id: string; name: string; path: string }

/** `native/`의 napi 애드온이 내보내는 API. 키다운 1회마다 활성 앱만 넘어오고 키 정보는 오지 않는다. */
export interface NativeHook {
  start(onKeydown: (app: AppIdentity | null) => void): void
  stop(): void
  permissionStatus(): PermissionStatus
  requestPermission(): void
  currentApp(): AppIdentity | null
}

const requireNative = createRequire(import.meta.url)

/** 패키징된 앱은 extraResources로 복사된 resources/native, 개발 중에는 저장소의 native를 쓴다. */
export function resolveNativeDir(opts: { isPackaged: boolean; resourcesPath: string; appPath: string }): string {
  return join(opts.isPackaged ? opts.resourcesPath : opts.appPath, 'native')
}

/** napi가 만든 플랫폼 로더(index.js)를 불러온다. 맞는 .node 파일이 없으면 예외를 던진다. */
export function loadNativeHook(nativeDir: string): NativeHook {
  return requireNative(join(nativeDir, 'index.js')) as NativeHook
}
