import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'sprite-editor': resolve(__dirname, 'sprite-editor.html'),
      },
      external: [/\/backup\//],
    },
  },
  server: {
    watch: {
      ignored: ['**/backup/**'],
    },
  },
});
