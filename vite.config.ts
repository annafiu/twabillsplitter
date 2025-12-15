import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Prioritize API_KEY, but also check VITE_API_KEY or GOOGLE_API_KEY
  // We also check process.env.API_KEY directly as a fallback for some Vercel build contexts
  const apiKey = env.API_KEY || env.VITE_API_KEY || env.GOOGLE_API_KEY || process.env.API_KEY;

  return {
    plugins: [react()],
    define: {
      // ONLY define the specific API key string replacement.
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});