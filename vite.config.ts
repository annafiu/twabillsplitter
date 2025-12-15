import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // We cast process to any to avoid TypeScript errors in the build script context
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // ONLY define the specific API key string replacement.
      // Do NOT define 'process.env': {} because it breaks React's internal NODE_ENV check.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});