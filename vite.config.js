import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The Spring Boot backend (Myntra-clone) runs on :8080. Everything the browser
// needs is proxied through :5173 so the HttpOnly `jwt_token` cookie is
// first-party and CORS never comes into it.
const target = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target, changeOrigin: true },
      '/gateway': { target, changeOrigin: true },
      '/orders': { target, changeOrigin: true },
      '/payments': { target, changeOrigin: true },
      '/v2/addresses': { target, changeOrigin: true },
      '/cart': { target, changeOrigin: true },
      '/wishlist': { target, changeOrigin: true },
    },
  },
});
