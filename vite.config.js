import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained dist/index.html (JS, CSS and fonts inlined) so it works offline from a file,
// inside the claude.ai artifact, and as the PWA shell. public/ holds the PWA files.
export default defineConfig({
  root: 'src',
  publicDir: '../public',
  base: './',
  plugins: [viteSingleFile()],
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2020', assetsInlineLimit: 100000000, cssCodeSplit: false },
});
