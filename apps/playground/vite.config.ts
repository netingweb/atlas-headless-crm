import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

const enablePWA = process.env.ENABLE_PWA === 'true';

export default defineConfig({
  plugins: [
    react(),
    ...(enablePWA
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'icons/*.png'],
            manifest: {
              name: 'Atlas CRM Headless Playground',
              short_name: 'Atlas CRM Playground',
              description: 'Playground for testing Atlas CRM Headless',
              theme_color: '#ffffff',
              icons: [
                {
                  src: 'icons/icon-192x192.png',
                  sizes: '192x192',
                  type: 'image/png',
                },
                {
                  src: 'icons/icon-512x512.png',
                  sizes: '512x512',
                  type: 'image/png',
                },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
              runtimeCaching: [
                {
                  urlPattern: /^https:\/\/api\./,
                  handler: 'NetworkFirst',
                  options: {
                    cacheName: 'api-cache',
                    networkTimeoutSeconds: 10,
                    cacheableResponse: {
                      statuses: [0, 200],
                    },
                  },
                },
              ],
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  optimizeDeps: {
    force: true, // Force re-optimization of dependencies
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      '@tanstack/react-query',
      'react-router-dom',
      '@langchain/core',
      '@langchain/openai',
      'langchain',
    ],
  },
});
