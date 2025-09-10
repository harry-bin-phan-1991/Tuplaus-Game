/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin(),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': {},
  },
  build: {
    lib: {
      entry: 'src/embed/web-component.tsx',
      name: 'TuplausWidget',
      fileName: (format) => `tuplaus-widget.${format}.js`,
      formats: ['umd', 'es'],
    },
    rollupOptions: {
      // Bundle react and react-dom into the widget to avoid UMD/runtime mismatches
      external: [],
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
