import { defineConfig } from 'vite';

export default defineConfig({
  base: '/ai-clicker-/',
  build: {
    outDir: 'dist',
  },
  server: {
    headers: {
      // Ensure optimal performance and security context for WebAssembly
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
