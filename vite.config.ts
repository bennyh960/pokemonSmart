import { defineConfig } from 'vite';
import { resolve } from 'path';
import { rmSync, existsSync } from 'fs';
import { glob } from 'glob';

export default defineConfig(({ mode }) => ({
  esbuild: {
    drop: mode === 'production' ? ['debugger'] : [],
    pure: mode === 'production' ? ['console.debug'] : [],
  },
  plugins: [
    // Remove backup folders from dist after build
    {
      name: 'remove-backup-folders',
      closeBundle() {
        const backupDirs = glob.sync('dist/**/backup', { onlyDirectories: true });
        8;
        for (const dir of backupDirs) {
          if (existsSync(dir)) {
            rmSync(dir, { recursive: true, force: true });
            console.log(`🗑️  Removed backup folder: ${dir}`);
          }
        }
      },
    },
  ],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'question-builder': resolve(__dirname, 'question-builder.html'),
        // 'sprite-editor': resolve(__dirname, 'sprite-editor.html'),
      },
    },
  },
  server: {
    watch: {
      ignored: ['**/backup/**', 'screens_examples_coords/**', 'scripts/**', 'docs/**', '.claude/**'],
    },
  },
}));
