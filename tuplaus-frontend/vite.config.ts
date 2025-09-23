/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  /*
  build: {
    lib: {
      entry: 'src/embed/web-component.tsx',
      name: 'TuplausWidget',
      fileName: (format) => `tuplaus-widget.${format}.js`,
      formats: ['umd'],
    },
    rollupOptions: {
      output: {
        globals: {
          react: 'React',
          'react-dom/client': 'ReactDOM',
        },
      },
    },
  },
  */
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
});
