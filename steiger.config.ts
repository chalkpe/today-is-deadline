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
    // 위젯 페이지(Task 15)에서 조립하기 전까지 참조가 없거나 하나뿐이다.
    files: ['./src/renderer/entities/day-stat/**', './src/renderer/widgets/heatmap-panel/**'],
    rules: { 'fsd/insignificant-slice': 'off' },
  },
])
