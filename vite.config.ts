import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages serves the app from /<repo-name>/, so the deploy workflow sets VITE_BASE.
  // Locally (and on Vercel/Netlify) it stays at the root.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
});
