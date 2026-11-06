import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Preserve the browser-facing Host so the API can verify same-origin requests.
const accountProxy = {target:'http://127.0.0.1:3001',changeOrigin:false};
export default defineConfig({
  plugins:[react(),tailwindcss()],
  // Separate concurrent dev servers so one optimizer cannot remove another's PDF module.
  cacheDir:`node_modules/.vite/dev-${process.pid}`,
  optimizeDeps:{include:['pdfjs-dist/legacy/build/pdf.mjs','mammoth/mammoth.browser','docx']},
  server:{proxy:{'/api/auth':accountProxy,'/api/profile':accountProxy,'/api/admin':accountProxy}},
  build:{outDir:'dist',emptyOutDir:true}
});
