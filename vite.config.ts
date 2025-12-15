import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioritize API_KEY, fallback to VITE_API_KEY for easier Vercel config
  const apiKey = env.API_KEY || env.VITE_API_KEY;

  return {
    plugins: [react()],
    define: {
      // ONLY define the specific API key string replacement.
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});