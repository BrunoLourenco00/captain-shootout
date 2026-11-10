import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  // Rapier ships its WASM inlined; a single large bundle is fine for a kiosk that loads once.
  build: { chunkSizeWarningLimit: 4000 },
});
