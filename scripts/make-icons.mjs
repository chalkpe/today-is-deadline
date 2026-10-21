// 임시 트레이·앱 아이콘을 만든다. 외부 패키지·네트워크 없이 zlib으로 PNG를 직접 인코딩한다.
// 실행: node scripts/make-icons.mjs → resources/icons/ (icon.icns는 macOS의 iconutil이 있을 때만)
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const OUT_DIR = fileURLToPath(new URL('../resources/icons/', import.meta.url))
const SUPERSAMPLE = 4

// ── PNG 인코더 ──────────────────────────────────────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(bytes) {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // 채널당 8비트
  header[9] = 6 // RGBA
  const stride = size * 4
  const raw = Buffer.alloc(size * (stride + 1))
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    signature,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── ICO 인코더 (Vista 이후 지원하는 PNG 페이로드) ───────────

function encodeIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // 아이콘
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    entry[0] = size >= 256 ? 0 : size
    entry[1] = size >= 256 ? 0 : size
    entry.writeUInt16LE(1, 4) // 색 평면
    entry.writeUInt16LE(32, 6) // 픽셀당 비트
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)])
}

// ── 도형과 래스터화 ─────────────────────────────────────────

const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1

function roundRect(x0, y0, x1, y1, r) {
  return (x, y) => {
    if (!(x >= x0 && x < x1 && y >= y0 && y < y1)) return false
    const dx = Math.max(x0 + r - x, x - (x1 - r), 0)
    const dy = Math.max(y0 + r - y, y - (y1 - r), 0)
    return dx * dx + dy * dy <= r * r
  }
}

const union =
  (...shapes) =>
  (x, y) =>
    shapes.some((shape) => shape(x, y))
const subtract = (shape, hole) => (x, y) => shape(x, y) && !hole(x, y)

/** grid 단위 좌표계의 도형 층(layers)을 size×size RGBA로 그린다. 층은 아래부터 겹친다. */
function render(size, grid, layers) {
  const rgba = Buffer.alloc(size * size * 4)
  const scale = size / grid
  const samples = SUPERSAMPLE * SUPERSAMPLE
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // 프리멀티플라이드 색으로 "over" 합성
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (const { color, shape } of layers) {
        let hits = 0
        for (let sy = 0; sy < SUPERSAMPLE; sy++) {
          for (let sx = 0; sx < SUPERSAMPLE; sx++) {
            if (shape((px + (sx + 0.5) / SUPERSAMPLE) / scale, (py + (sy + 0.5) / SUPERSAMPLE) / scale)) hits++
          }
        }
        const alpha = (hits / samples) * color[3]
        r = color[0] * alpha + r * (1 - alpha)
        g = color[1] * alpha + g * (1 - alpha)
        b = color[2] * alpha + b * (1 - alpha)
        a = alpha + a * (1 - alpha)
      }
      const i = (py * size + px) * 4
      rgba[i] = a === 0 ? 0 : Math.round(r / a)
      rgba[i + 1] = a === 0 ? 0 : Math.round(g / a)
      rgba[i + 2] = a === 0 ? 0 : Math.round(b / a)
      rgba[i + 3] = Math.round(a * 255)
    }
  }
  return encodePng(size, rgba)
}

// ── 그림 ────────────────────────────────────────────────────

// 16 단위 격자의 키보드: 둥근 몸체에 키 자리를 뚫는다(3줄: 키 4개, 키 4개, 스페이스 바).
const KEYBOARD = subtract(
  roundRect(1, 3, 15, 13, 1.5),
  union(
    rect(2, 4, 4, 6),
    rect(5, 4, 7, 6),
    rect(8, 4, 10, 6),
    rect(11, 4, 14, 6),
    rect(2, 7, 5, 9),
    rect(6, 7, 8, 9),
    rect(9, 7, 11, 9),
    rect(12, 7, 14, 9),
    rect(4, 10, 12, 12),
  ),
)

const BLACK = [0, 0, 0, 1]
const DIMMED_BLACK = [0, 0, 0, 0.35] // 템플릿 이미지는 알파만 쓰므로 흐린 아이콘은 알파를 낮춘다
const GREEN = [0x39, 0xd3, 0x53, 1] // 기본 기준색
const GRAY = [0x8e, 0x8e, 0x93, 1]
const PANEL = [0x1a, 0x1a, 0x1e, 1] // 위젯 패널 색

const keyboard = (size, color) => render(size, 16, [{ color, shape: KEYBOARD }])

// 100 단위 격자의 앱 아이콘: 어두운 둥근 사각형 바탕 + 'T'
const appIcon = (size) =>
  render(size, 100, [
    { color: PANEL, shape: roundRect(10, 10, 90, 90, 18) },
    { color: GREEN, shape: union(rect(30, 28, 70, 39), rect(44.5, 28, 55.5, 72)) },
  ])

// ── 출력 ────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true })
const write = (name, data) => {
  writeFileSync(join(OUT_DIR, name), data)
  console.log(`resources/icons/${name}`)
}

// macOS 메뉴 막대: 템플릿 이미지(검정+투명), 16pt와 @2x
write('trayTemplate.png', keyboard(16, BLACK))
write('trayTemplate@2x.png', keyboard(32, BLACK))
write('tray-offTemplate.png', keyboard(16, DIMMED_BLACK))
write('tray-offTemplate@2x.png', keyboard(32, DIMMED_BLACK))

// Windows 알림 영역: 어두운·밝은 작업 표시줄 모두에서 보이도록 색 있는 아이콘, 배율 100~300%
const TRAY_SIZES = [16, 20, 24, 32, 40, 48]
write('tray.ico', encodeIco(TRAY_SIZES.map((size) => ({ size, png: keyboard(size, GREEN) }))))
write('tray-off.ico', encodeIco(TRAY_SIZES.map((size) => ({ size, png: keyboard(size, GRAY) }))))

// 앱 아이콘
write('icon.png', appIcon(512))
write('icon.ico', encodeIco([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, png: appIcon(size) }))))

if (process.platform === 'darwin') {
  const workDir = mkdtempSync(join(tmpdir(), 'make-icons-'))
  const iconset = join(workDir, 'icon.iconset')
  mkdirSync(iconset)
  for (const size of [16, 32, 128, 256, 512]) {
    writeFileSync(join(iconset, `icon_${size}x${size}.png`), appIcon(size))
    writeFileSync(join(iconset, `icon_${size}x${size}@2x.png`), appIcon(size * 2))
  }
  execFileSync('iconutil', ['-c', 'icns', '-o', join(OUT_DIR, 'icon.icns'), iconset])
  rmSync(workDir, { recursive: true, force: true })
  console.log('resources/icons/icon.icns')
} else {
  console.warn('icon.icns는 macOS의 iconutil이 필요해 건너뛴다')
}
