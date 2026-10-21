import { app, type NativeImage, nativeImage } from 'electron'
import { firstIconPng, type IconLoaders, iconStrategies } from './icon'

const toPng = (image: NativeImage) => (image.isEmpty() ? null : new Uint8Array(image.toPNG()))

const loaders: IconLoaders = {
  thumbnail: (path) => nativeImage.createThumbnailFromPath(path, { width: 32, height: 32 }).then(toPng),
  fileIcon: (path) => app.getFileIcon(path, { size: 'small' }).then(toPng),
}

/** 카운터의 getIcon. 플랫폼별 전략으로 실행 파일·번들의 아이콘 PNG를 얻고, 모두 실패하면 null(기본 아이콘)로 둔다. */
export function fileIconPng(path: string): Promise<Uint8Array | null> {
  return firstIconPng(path, iconStrategies(process.platform), loaders)
}
