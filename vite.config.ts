import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173, strictPort: false, allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
  build: {
    target: 'es2022',
    sourcemap: false,
    // pdf-lib ist ~500 kB und wird erst beim PDF-Klick gebraucht — eigener Chunk,
    // damit der Editor ohne PDF-Export schnell lädt.
    rollupOptions: {
      output: {
        manualChunks: (id: string) => (id.includes('pdf-lib') || id.includes('@pdf-lib') ? 'pdf' : undefined),
      },
    },
  },
});
