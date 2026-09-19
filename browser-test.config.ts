import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{outDir:'.browser-dist',rollupOptions:{input:'browser-test.html'}}});
