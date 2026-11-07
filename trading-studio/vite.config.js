import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `vite build --mode artifact` produces the browser-only web build used for the claude.ai artifact.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'artifact' ? './' : '/',
  define: mode === 'artifact' ? { 'import.meta.env.VITE_STANDALONE': JSON.stringify('true') } : {},
  build: mode === 'artifact'
    ? { outDir: 'dist-artifact', assetsInlineLimit: 1e8, cssCodeSplit: false, rollupOptions: { output: { inlineDynamicImports: true } } }
    : {},
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8787', '/uploads': 'http://localhost:8787' },
  },
}));
