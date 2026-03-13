import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()],
  css: {
    // This forces Vite to use standard PostCSS instead of the 
    // broken LightningCSS/Oxide binary on your Windows machine
    transformer: 'postcss', 
  },
  optimizeDeps: {
    // This excludes the problematic Tailwind binary from Vite's optimization cycle
    exclude: ['@tailwindcss/oxide', '@tailwindcss/oxide-win32-x64-msvc']
  },
  build: {
    // This prevents the production builder from failing on the same error
    cssMinify: 'lightningcss' === 'false' ? 'lightningcss' : 'esbuild'
  },
  resolve: {
  alias: {
    // This tells Vite: "When you see '@/', replace it with the absolute path to '/src/'"
    '@': path.resolve(__dirname, './src'), 
  },
},
})
