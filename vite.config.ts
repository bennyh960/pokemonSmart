import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import { glob } from 'glob';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
    react(),
    tailwindcss(),
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
      // virtual module to load all names of trainers to be pre load in trainer cinematic
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
    {
      // strip out the admin move hacker code in production build since it's only meant for development/testing and can be a security risk if left in
      name: 'strip-admin-hacker',
      resolveId(id, importer) {
        if (mode === 'production' && id.includes('admin-move-hacker')) {
          return '\0admin-move-hacker-stub';
        }
      },
      load(id) {
        if (id === '\0admin-move-hacker-stub') {
          return `
        export function openMoveHacker() {}
        export function closeMoveHacker() {}
        export function isMoveHackerOpen() { return false; }
        export function handleMoveHackerKey() { return false; }
      `;
        }
      },
    },
  ],
  base: './',
  build: {
    sourcemap: mode === 'development', // for debugger
    // explicitly set what will include in the bundle (currently index.html and question-builder.html)
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
