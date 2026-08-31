import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import credentialsHandler from './api/credentials.js';

function localCredentialsApi() {
  return {
    name: 'aletheia-local-credentials-api',
    configureServer(server) {
      server.middlewares.use('/api/credentials', async (req, res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        try {
          req.body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
        } catch {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Malformed JSON request.' }));
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
  },
});
