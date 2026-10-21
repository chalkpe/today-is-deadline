import { app } from 'electron'

/** 카운터의 getIcon. 실행 파일·번들의 작은 아이콘을 PNG로 얻고, 실패하면 null(기본 아이콘)로 둔다. */
export function fileIconPng(path: string): Promise<Uint8Array | null> {
  return app
    .getFileIcon(path, { size: 'small' })
    .then((icon) => new Uint8Array(icon.toPNG()))
    .catch(() => null)
}
