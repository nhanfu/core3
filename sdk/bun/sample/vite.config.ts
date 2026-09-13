import { defineConfig } from 'vite';
import { extname, resolve } from 'node:path';
import { core3Components } from '@core3/client/vite';

const sampleRoot = resolve(import.meta.dirname);
const publicRoot = resolve(sampleRoot, 'public');
const clientRoot = resolve(sampleRoot, '../packages/client/src');
const serverRoot = resolve(sampleRoot, '../packages/server/src');
const backendPort = Number(process.env.CORE3_BACKEND_PORT || '3001');
const frontendPort = Number(process.env.CORE3_FRONTEND_PORT || '3002');

function workspaceSourceBridge() {
  const roots = {
    client: clientRoot,
    server: serverRoot,
  } as const;

  return {
    name: 'core3-workspace-source-bridge',
    configureServer(server: { middlewares: { use: (handler: (req: any, res: any, next: () => void) => void) => void } }) {
      server.middlewares.use((request, _response, next) => {
        const sourceUrl = String(request.url || '');
        const match = sourceUrl.match(/^\/packages\/(client|server)\/src\/(.+?)(\?.*)?$/);
        if (!match) {
          next();
          return;
        }
        let relativePath: string;
        try {
          relativePath = decodeURIComponent(match[2]);
        } catch {
          next();
          return;
        }
        if (relativePath.includes('..') || relativePath.includes('\\')) {
          next();
          return;
        }
        const root = roots[match[1] as keyof typeof roots];
        const absolutePath = resolve(root, relativePath);
        if (!absolutePath.startsWith(`${root}/`)) {
          next();
          return;
        }
        const sourcePath = extname(absolutePath) ? absolutePath : `${absolutePath}.ts`;
        request.url = `/@fs${sourcePath}${match[3] || ''}`;
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [workspaceSourceBridge(), core3Components()],
  root: publicRoot,
  publicDir: false,
  resolve: {
    alias: {
      '@core3/client': clientRoot,
      '@core3/server': serverRoot,
    },
  },
  server: {
    host: '127.0.0.1',
    port: frontendPort,
    // The dev orchestrator checks the port before spawning Vite, but another
    // process can claim it in that small window. Let Vite advance to the next
    // port instead of terminating the whole dev stack.
    strictPort: false,
    proxy: {
      '/api': `http://127.0.0.1:${backendPort}`,
      '/services': `http://127.0.0.1:${backendPort}`,
      '/web': `http://127.0.0.1:${backendPort}`,
      '/jsonrpc': `http://127.0.0.1:${backendPort}`,
    },
  },
  build: {
    outDir: resolve(sampleRoot, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(publicRoot, 'index.html'),
    },
  },
});
