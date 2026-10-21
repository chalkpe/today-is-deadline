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
    build: { externalizeDeps: true, lib: { entry: fromRoot('./src/app/preload/index.ts') } },
  },
  renderer: {
    root: fromRoot('./src/app/renderer'),
    resolve: { alias },
    plugins: [react(), tailwindcss()],
    build: { rolldownOptions: { input: fromRoot('./src/app/renderer/index.html') } },
  },
})
