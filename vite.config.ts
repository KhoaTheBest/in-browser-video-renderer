import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Cloudflare Web Analytics (cookieless). Injected only when a token is configured. */
function analytics(token: string | undefined): Plugin {
  return {
    name: 'cf-web-analytics',
    transformIndexHtml: () =>
      token
        ? [{ tag: 'script', attrs: { defer: true, src: 'https://static.cloudflareinsights.com/beacon.min.js', 'data-cf-beacon': JSON.stringify({ token }) }, injectTo: 'body' }]
        : [],
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return { plugins: [react(), analytics(env.VITE_ANALYTICS_TOKEN || undefined)] };
});
