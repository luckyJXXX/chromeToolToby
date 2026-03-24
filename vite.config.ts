import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'

// 构建前复制静态文件到 dist
const copyStaticFiles = () => ({
  name: 'copy-static-files',
  closeBundle() {
    const distDir = resolve(__dirname, 'dist')
    const filesToCopy = ['manifest.json', 'background.js']

    for (const file of filesToCopy) {
      const src = resolve(__dirname, file)
      const dest = resolve(distDir, file)
      if (existsSync(src)) {
        copyFileSync(src, dest)
        console.log(`Copied ${file} to dist/`)
      }
    }
  }
})

export default defineConfig({
  plugins: [react(), copyStaticFiles()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  base: './'
})
