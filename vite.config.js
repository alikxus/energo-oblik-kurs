import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' -> relative assets, works both locally and under GitHub Pages /repo/ subpath
export default defineConfig({
  base: './',
  plugins: [react()],
})
