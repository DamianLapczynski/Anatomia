import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Wersja pamięci offline (public/sw.js) liczona z zawartości modeli i danych: po podmianie modeli albo danych
// powracający użytkownicy dostają nowe pliki, a zwykła zmiana kodu nie wymusza ponownego pobierania ~19 MB modeli.
function swVersion() {
  return {
    name: 'sw-version',
    apply: 'build',
    closeBundle() {
      const h = crypto.createHash('sha1');
      const walk = (dir) => { for (const f of fs.readdirSync(dir).sort()) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) walk(p); else h.update(f).update(fs.readFileSync(p)); } };
      walk('public/models'); walk('public/data');
      const sw = 'dist/sw.js';
      if (!fs.existsSync(sw)) return;
      fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/const C = '[^']*';[^\n]*/, `const C = 'anatomia-${h.digest('hex').slice(0, 10)}'; // wstawione przy budowaniu (vite.config.js)`));
    },
  };
}

export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(new Date().toISOString()) },
  plugins: [swVersion()],
  build: {
    target: 'es2022', chunkSizeWarningLimit: 1500,
    // three.js w osobnym pliku: zmienia się rzadziej niż kod aplikacji, więc zostaje w pamięci przeglądarki między wydaniami
    rollupOptions: { output: { manualChunks: (id) => (id.includes('node_modules/three/') ? 'three' : undefined) } },
  },
});
