import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {copyFileSync} from 'node:fs';
export default defineConfig({base:'./',plugins:[react(),{name:'velora-software-notices',apply:'build',closeBundle(){copyFileSync('THIRD-PARTY-NOTICES.txt','dist/THIRD-PARTY-NOTICES.txt');}}],server:{host:'127.0.0.1',port:5173,strictPort:true}});
