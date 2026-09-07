import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` so the built site works from a repository sub-path on GitHub
// Pages without knowing the repository name at build time.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    // The content JSON is imported, not fetched, so a hand-edited rule change
    // is a rebuild rather than a silent 404. Keep it in its own chunk so a
    // content edit does not invalidate the application bundle.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/content/')) return 'content';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
