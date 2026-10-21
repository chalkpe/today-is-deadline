export type IconStrategy = 'thumbnail' | 'fileIcon'

export type IconLoaders = Record<IconStrategy, (path: string) => Promise<Uint8Array | null>>

/**
 * 앱 아이콘을 얻는 방법의 시도 순서.
 * macOS의 app.getFileIcon은 .app 번들에 확장자별 일반 아이콘만 주므로 QuickLook 썸네일을 먼저 쓴다.
 */
export function iconStrategies(platform: NodeJS.Platform): IconStrategy[] {
  return platform === 'darwin' ? ['thumbnail', 'fileIcon'] : ['fileIcon']
}

/** 전략을 순서대로 시도해 처음 얻은 PNG를 돌려준다. 실패(거부·throw·null·빈 PNG)는 다음 전략으로 넘기고, 모두 실패하면 null. */
export async function firstIconPng(path: string, strategies: IconStrategy[], loaders: IconLoaders): Promise<Uint8Array | null> {
  for (const strategy of strategies) {
    try {
      const png = await loaders[strategy](path)
      if (png && png.length > 0) return png
    } catch {
      // 다음 전략으로
    }
  }
  return null
}
