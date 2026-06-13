import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import type { Plugin } from 'vite';

const editorRoot = path.resolve(
  __dirname,
  '../../editor.worktrees/mediabunny-video',
);
const editorSrc = path.resolve(editorRoot, 'src');

const editorPathAliases: Record<string, string> = {
  '@brandVisualLook': path.resolve(editorSrc, 'brandVisualLook'),
  '@common': path.resolve(editorSrc, 'common'),
  '@data': path.resolve(editorSrc, 'data'),
  '@editor': path.resolve(editorSrc, 'editor'),
  '@modules': path.resolve(editorSrc, 'modules'),
  '@storage': path.resolve(editorSrc, 'storage'),
  '@store': path.resolve(editorSrc, 'store'),
  '@styles': path.resolve(editorSrc, 'styles'),
  '@svg-icons': path.resolve(editorSrc, 'svg-icons'),
};

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

function editorDevResolvePlugin(): Plugin {
  return {
    name: 'editor-dev-resolve',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (source === '@modules' || source.startsWith('@modules/')) {
        const target = editorPathAliases['@modules'];
        const resolved = source.replace('@modules', target);
        return this.resolve(resolved, importer, { skipSelf: true, ...options });
      }
      if (!importer || !importer.startsWith(editorSrc)) return null;
      for (const [alias, target] of Object.entries(editorPathAliases)) {
        if (alias === '@modules') continue;
        if (source === alias || source.startsWith(alias + '/')) {
          const resolved = source.replace(alias, target);
          return this.resolve(resolved, importer, {
            skipSelf: true,
            ...options,
          });
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    apiProxyPlugin(),
    editorDevResolvePlugin(),
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
    alias: {
      '@btg-pencil-ai/editor': path.resolve(editorSrc, 'index.ts'),
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
    fs: {
      allow: ['.', editorRoot],
    },
  },
  optimizeDeps: {
    include: ['jotai', 'nanoid', 'lodash'],
  },
});
