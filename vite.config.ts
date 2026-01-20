import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // 从环境变量读取端口，默认 3000
    const devPort = parseInt(env.VITE_DEV_PORT || '3000', 10);
    
    return {
      server: {
        port: devPort,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://127.0.0.1:5678',
            changeOrigin: true,
            secure: false,
            configure: (proxy, _options) => {
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                // 确保发送 cookie
                if (req.headers.cookie) {
                  proxyReq.setHeader('Cookie', req.headers.cookie);
                }
              });
            },
          },
          '/rest': {
            target: 'http://127.0.0.1:5678',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path, // 保持路径不变，转发 /rest/xxx 到后端 /rest/xxx
            cookieDomainRewrite: '', // 保持 Cookie 域名
            cookiePathRewrite: '/', // 保持 Cookie 路径
            configure: (proxy, _options) => {
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                // 确保发送 cookie（包括 n8n-auth）
                if (req.headers.cookie) {
                  proxyReq.setHeader('Cookie', req.headers.cookie);
                }
              });
              proxy.on('proxyRes', (proxyRes, req, res) => {
                // 确保接收到的 Set-Cookie 头被正确转发
                // Vite 代理会自动处理，但我们可以确保 Cookie 被正确设置
                const setCookieHeaders = proxyRes.headers['set-cookie'];
                if (setCookieHeaders) {
                  // 确保 Cookie 的域名和路径正确
                  res.setHeader('Set-Cookie', setCookieHeaders);
                }
              });
            },
          },
          // 只代理 /types/ 路径（带斜杠），不代理 /types.ts 等文件
          '^/types/': {
            target: 'http://127.0.0.1:5678',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path, // 保持路径不变，转发 /types/xxx 到后端 /types/xxx
            configure: (proxy, _options) => {
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                // 确保发送 cookie
                if (req.headers.cookie) {
                  proxyReq.setHeader('Cookie', req.headers.cookie);
                }
              });
            },
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
