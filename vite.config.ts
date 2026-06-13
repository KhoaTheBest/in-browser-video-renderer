import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import type { Plugin } from 'vite';
import https from 'node:https';
import hostMapJson from './src/config/host-map.json';

const hostMap: Record<string, string> = hostMapJson;

function apiProxyPlugin(): Plugin {
  return {
    name: 'api-proxy-plugin',
    configureServer(server) {
      server.middlewares.use((req: any, res: any, next: () => void) => {
        if (!req.url?.startsWith('/api-proxy')) {
          return next();
        }

        try {
          const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
          const targetUrlParam = parsedUrl.searchParams.get('url');

          if (!targetUrlParam) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
          }

          const targetUrl = new URL(targetUrlParam);
          const mappedHostname =
            hostMap[targetUrl.hostname] || targetUrl.hostname;

          const options: any = {
            hostname: mappedHostname,
            port: targetUrl.port || 443,
            path: targetUrl.pathname + targetUrl.search,
            method: req.method,
            headers: {
              'User-Agent': 'Vite Proxy',
            },
          };

          if (req.headers.authorization) {
            options.headers!['Authorization'] = req.headers.authorization;
          }

          const proxyReq = https.request(options, (proxyRes: any) => {
            res.statusCode = proxyRes.statusCode || 500;

            // Forward headers but modify CORS
            for (const [key, value] of Object.entries(proxyRes.headers)) {
              if (key.toLowerCase() !== 'access-control-allow-origin') {
                if (value) res.setHeader(key, value);
              }
            }

            res.setHeader('Access-Control-Allow-Origin', '*');

            proxyRes.pipe(res, { end: true });
          });

          proxyReq.on('error', (err: Error) => {
            console.error('Proxy error:', err);
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                error: 'Proxy request failed',
                details: err.message,
              }),
            );
          });

          req.pipe(proxyReq, { end: true });
        } catch (err: any) {
          console.error('Proxy setup error:', err);
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error: 'Proxy setup failed',
              details: err.message,
            }),
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    apiProxyPlugin(),
    react(),
    svgr({
      svgrOptions: {
        exportType: 'named',
        ref: true,
        svgo: false,
        titleProp: true,
      },
      include: '**/*.svg',
    }),
  ],
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'remotion',
      '@remotion/player',
      '@remotion/media',
      'jotai',
    ],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  optimizeDeps: {
    include: ['jotai', 'nanoid', 'lodash'],
  },
});
