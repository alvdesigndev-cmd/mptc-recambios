// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null, // solo registramos desde el wrapper protegido
        filename: "sw.js",
        strategies: "generateSW",
        devOptions: { enabled: false },
        workbox: {
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false, // controlamos la activación con el toast
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "mptc-html",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\/assets\/.+\.(js|css|woff2?)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "mptc-assets",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        manifest: false, // usamos el manifest.webmanifest ya presente en public/
      }),
    ],
  },
});
