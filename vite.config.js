import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes the build work whether it's served at the root of a
// user page (username.github.io) or a subpath (username.github.io/repo-name)
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html'
      }
    }
  }
})
