import { defineConfig } from 'vite';
export default defineConfig({ base: './', define: { __BUILD__: JSON.stringify(new Date().toISOString()) }, build: { target: 'es2022', chunkSizeWarningLimit: 1500 } });
