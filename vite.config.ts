import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import { glob } from 'glob';

// for use in battle cinematic check if trainer sprite exists
const virtualModuleId = 'virtual:trainer-sprites';

export default defineConfig(({ mode }) => ({
  preview: {
    port: 4173,
    strictPort: true,
  },
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
        for (const dir of backupDirs) {
          if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            console.log(`🗑️  Removed backup folder: ${dir}`);
          }
        }
      },
    },
    {
      name: 'trainer-sprites',
      resolveId(id) {
        if (id === virtualModuleId) return '\0' + virtualModuleId;
      },
      load(id) {
        if (id === '\0' + virtualModuleId) {
          const dir = path.resolve(__dirname, 'public/sprites/trainers');
          const names = fs
            .readdirSync(dir)
            .filter((f) => f.endsWith('.png'))
            .map((f) => f.replace('.png', ''));
          return `export const trainerSprites = new Set(${JSON.stringify(names)});`;
        }
      },
    },
  ],
  base: './',
  build: {
    sourcemap: mode === 'development', // for debugger
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'question-builder': path.resolve(__dirname, 'question-builder.html'),
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
