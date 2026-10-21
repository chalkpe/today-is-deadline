import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // main 프로세스 엔티티·피처는 세그먼트 없이 슬라이스 루트에 파일을 둔다.
    files: ['./src/main/entities/**', './src/main/features/**'],
    rules: { 'fsd/no-segmentless-slices': 'off' },
  },
])
