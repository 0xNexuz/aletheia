import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import credentialsHandler from './api/credentials.js';
import { relayDemoCredential } from './lib/demo-issuer-relay.js';

function localCredentialsApi() {
  return {
    name: 'aletheia-local-credentials-api',
    configureServer(server) {
      server.middlewares.use('/api/credentials', async (req, res) => {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        if (req.headers.origin && !['http://127.0.0.1:3000', 'http://localhost:3000'].includes(req.headers.origin)) {
          res.statusCode = 403; res.end(JSON.stringify({ error: 'Local requests only.' })); return;
        }
        if (req.method === 'POST' && !/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
          res.statusCode = 415; res.end(JSON.stringify({ error: 'JSON content type required.' })); return;
        }
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 4096) { res.statusCode = 413; res.end(JSON.stringify({ error: 'Request too large.' })); return; }
          chunks.push(chunk);
        }
        try {
          req.body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
        } catch {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Malformed JSON request.' }));
          return;
        }

        if (process.env.ALETHEIA_DEMO_ISSUER_ORIGIN) {
          try {
            const result = await relayDemoCredential(req.method, req.body, process.env.ALETHEIA_DEMO_ISSUER_ORIGIN);
            res.statusCode = result.status;
            res.end(JSON.stringify(result.body));
          } catch { res.statusCode = 503; res.end(JSON.stringify({ error: 'The approved demo issuer origin is not configured correctly.' })); }
          return;
        }

        const publicKey = {
          x: process.env.ALETHEIA_DEMO_ISSUER_PUBLIC_KEY_X,
          y: process.env.ALETHEIA_DEMO_ISSUER_PUBLIC_KEY_Y,
        };
        if (req.method === 'GET' && !process.env.ALETHEIA_DEMO_ISSUER_SECRET
          && /^\d+$/.test(publicKey.x || '') && /^\d+$/.test(publicKey.y || '')) {
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.setHeader('cache-control', 'no-store');
          res.end(JSON.stringify({
            providerId: '1',
            publicKey,
            label: 'Alethia signed demo issuer — test credentials only',
          }));
          return;
        }

        const response = {
          status(code) { res.statusCode = code; return response; },
          json(value) {
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.setHeader('cache-control', 'no-store');
            res.end(JSON.stringify(value));
          },
        };
        await credentialsHandler(req, response);
      });
    },
  };
}

export default defineConfig({
  plugins: [wasm(), localCredentialsApi()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: { input: { main: 'index.html', deploy: 'deploy.html' } },
  },
});
