import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({plugins:[react(),tailwindcss()], publicDir:fileURLToPath(new URL('../../public',import.meta.url)),server:{port:5173,strictPort:true,proxy:{'/api':'http://127.0.0.1:3001','/socket.io':{target:'http://127.0.0.1:3001',ws:true}}},build:{chunkSizeWarningLimit:650}});
