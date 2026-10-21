import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // main 프로세스 엔티티·피처는 세그먼트 없이 슬라이스 루트에 파일을 둔다.
    files: ['./src/main/entities/**', './src/main/features/**'],
    rules: { 'fsd/no-segmentless-slices': 'off' },
  },
  {
    // 위젯 페이지만 쓰는 슬라이스(규칙을 끈 heatmap-panel의 참조는 세지 않아 day-stat도 포함)를 계획의 FSD 구조대로 둔다.
    files: [
      './src/renderer/entities/day-stat/**',
      './src/renderer/widgets/heatmap-panel/**',
      './src/renderer/features/alert-audio/**',
      './src/renderer/features/resize-handle/**',
    ],
    rules: { 'fsd/insignificant-slice': 'off' },
  },
])
