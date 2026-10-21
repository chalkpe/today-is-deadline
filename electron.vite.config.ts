import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url))

const alias = {
  '@shared': fromRoot('./src/shared'),
  '@main': fromRoot('./src/main'),
  '@renderer': fromRoot('./src/renderer'),
}

export default defineConfig({
  main: {
    resolve: { alias },
    build: { externalizeDeps: true, lib: { entry: fromRoot('./src/app/main/index.ts') } },
  },
  preload: {
    resolve: { alias },
    // 샌드박스 preload는 ESM을 실행하지 못하므로 CJS(index.cjs)로 내보낸다.
    build: { externalizeDeps: true, lib: { entry: fromRoot('./src/app/preload/index.ts'), formats: ['cjs'] } },
  },
  renderer: {
    root: fromRoot('./src/app/renderer'),
    resolve: { alias },
    plugins: [react(), tailwindcss()],
    build: { rolldownOptions: { input: fromRoot('./src/app/renderer/index.html') } },
  },
})
