import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProductionLike = mode === 'production';
  const env = loadEnv(mode, process.cwd(), '');
  const devProxyTarget = (env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:4000').trim().replace(/\/$/, '');
  const backendUrl = (env.VITE_API_BASE_URL || devProxyTarget).trim().replace(/\/$/, '');

  const devCsp = `default-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' ws: wss: ${backendUrl} http://localhost:3000; font-src 'self' data:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`;
  const strictCsp = `default-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com; connect-src 'self' ${backendUrl}; font-src 'self' data:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`;

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
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // SOLUCIÓN AL ERROR DE IMAGEN image_567ce2.png:
              // Agrupamos React y dependencias esenciales para que siempre estén disponibles.
              if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
                return 'vendor-core';
              }
              if (id.includes('@radix-ui')) return 'vendor-radix';
              if (id.includes('recharts')) return 'vendor-charts';
              if (id.includes('quill')) return 'vendor-editor';
              if (id.includes('@monaco-editor')) return 'vendor-monaco';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('react-hook-form')) return 'vendor-form';
              if (id.includes('sonner')) return 'vendor-toast';
              if (id.includes('xlsx')) return 'vendor-xlsx';
              if (id.includes('jointjs') || id.includes('mermaid')) return 'vendor-diagrams';
              if (id.includes('react-markdown') || id.includes('remark-')) return 'vendor-markdown';
              return 'vendor-misc';
            }
            if (id.includes('/components/')) {
              if (id.includes('ContentManagementScreen')) return 'screen-content';
              if (id.includes('SequenceManagementScreen')) return 'screen-sequence';
              if (id.includes('SubtemaSequenceManagementScreen')) return 'screen-subtema-seq';
              if (id.includes('SubThemeManagementScreen')) return 'screen-subtheme';
              if (id.includes('TemasManagementScreen')) return 'screen-temas';
              if (id.includes('AreasManagementScreen')) return 'screen-areas';
              if (id.includes('ExerciseManagementScreen')) return 'screen-exercise';
              if (id.includes('MiniproyectoManagementScreen')) return 'screen-miniproyecto';
              if (id.includes('ChatbotManagementScreen')) return 'screen-chatbot';
              if (id.includes('DocenteManagementScreen')) return 'screen-docentes';
              if (id.includes('AdminManagementScreen')) return 'screen-admins';
              if (id.includes('ProgrammingContentView')) return 'screen-programming';
              if (id.includes('UMLDiagramView') || id.includes('ClassDiagramEditor')) return 'screen-uml';
              if (id.includes('TheoryContentView')) return 'screen-theory';
              if (id.includes('ConfigurableMiniproyecto') || id.includes('CreateConfigurableMiniproyecto')) return 'screen-configurable';
              if (id.includes('StudentUploadScreen')) return 'screen-upload';
              if (id.includes('ReportsScreen')) return 'screen-reports';
              if (id.includes('StudentTrackingScreen')) return 'screen-tracking';
            }
          },
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
      headers: {
        'Content-Security-Policy': strictCsp,
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
  };
});