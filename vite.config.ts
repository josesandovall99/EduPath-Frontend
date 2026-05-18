import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProductionLike = mode === 'production';
  const env = loadEnv(mode, process.cwd(), '');
  const devProxyTarget = (env.VITE_DEV_PROXY_TARGET || 'http://192.168.3.21:4000').trim().replace(/\/$/, '');
  const backendUrl = (env.VITE_API_BASE_URL || devProxyTarget).trim().replace(/\/$/, '');
  const localBackendOrigins =
    'http://localhost:4000 http://127.0.0.1:4000 http://192.168.3.21:4000';

  const devCsp = `default-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' ws: wss: ${backendUrl} ${localBackendOrigins} http://localhost:3000; font-src 'self' data:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`;
  const strictCsp = `default-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com; connect-src 'self' ${backendUrl} ${localBackendOrigins}; font-src 'self' data:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`;

  const devHeaders: Record<string, string> = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };

  if (isProductionLike) {
    devHeaders['Content-Security-Policy'] = strictCsp;
  }

  return {
    plugins: [react()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'vaul@1.1.2': 'vaul',
        'sonner@2.0.3': 'sonner',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'next-themes@0.4.6': 'next-themes',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        'figma:asset/a8ee7cfd19d700913d7e71c907ce6f4bd027fcb9.png': path.resolve(__dirname, './src/assets/a8ee7cfd19d700913d7e71c907ce6f4bd027fcb9.png'),
        'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png': path.resolve(__dirname, './src/assets/898bd8e2c46596e40b55d8328f5f754f003aa92a.png'),
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      cssCodeSplit: true,
      sourcemap: false,
      reportCompressedSize: false,
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 1500,
      // Minificación JS con esbuild + CSS con lightningcss
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        output: {
          // Code splitting manual: separa librerías pesadas en chunks cacheables
          manualChunks(id) {
            // React core — carga siempre, debe estar en chunk propio para cache
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-react';
            }
            // Radix UI — muchos componentes, chunk independiente
            if (id.includes('node_modules/@radix-ui/')) {
              return 'vendor-radix';
            }
            // Recharts + d3 — solo se usa en Reports/Dashboard, chunk separado
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3') || id.includes('node_modules/victory')) {
              return 'vendor-charts';
            }
            // Librerías pesadas de edición: cargan solo en pantallas específicas
            if (id.includes('node_modules/quill') || id.includes('node_modules/react-quill')) {
              return 'vendor-quill';
            }
            if (id.includes('node_modules/@monaco-editor') || id.includes('node_modules/monaco-editor')) {
              return 'vendor-monaco';
            }
            if (id.includes('node_modules/jointjs') || id.includes('node_modules/@joint')) {
              return 'vendor-joint';
            }
            // Markdown y resaltado de código
            if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark') || id.includes('node_modules/rehype')) {
              return 'vendor-markdown';
            }
            // Resto de node_modules como vendor general
            if (id.includes('node_modules/')) {
              return 'vendor-misc';
            }
          },
        },
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
        },
      },
    },
    server: {
      port: 3000,
      open: true,
      headers: devHeaders,
      proxy: {
        '/api': {
          target: devProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': {
          target: devProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
      headers: {
        'Content-Security-Policy': strictCsp,
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Permite bfcache (back/forward cache) sin guardar en disco
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },
  };
});