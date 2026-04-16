import { defineConfig, loadEnv } from "vite";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    // ─── Base para servidor propio (raíz del dominio) ─────────────────────────
    base: env.VITE_BASE_URL || "/",

    // ─── Entradas HTML ────────────────────────────────────────────────────────
    root: ".",
    publicDir: "public",

    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: false,          // Cambiar a true solo en staging
      minify: "oxc",             // Vite 6+ usa Oxc (esbuild ya no viene incluido)

      rollupOptions: {
        input: {
          main:          resolve(__dirname, "index.html"),
          routines:      resolve(__dirname, "routines.html"),
          liveSession:   resolve(__dirname, "live-session.html"),
        },

        output: {
          // Chunks con nombres legibles y cache-friendly
          entryFileNames:  "assets/js/[name]-[hash].js",
          chunkFileNames:  "assets/js/[name]-[hash].js",
          assetFileNames:  ({ name }) => {
            if (/\.(woff2?|ttf|otf|eot)$/i.test(name))
              return "assets/fonts/[name]-[hash][extname]";
            if (/\.(png|jpe?g|svg|gif|webp|ico)$/i.test(name))
              return "assets/icons/[name]-[hash][extname]";
            if (/\.css$/i.test(name))
              return "assets/css/[name]-[hash][extname]";
            return "assets/[name]-[hash][extname]";
          },

          // Code-splitting manual para mejor caché
          manualChunks(id) {
            if (id.includes("node_modules"))    return "vendor";
            if (id.includes("/api/services/"))  return "api-services";
            if (id.includes("/api/modules/"))   return "api-modules";
          },
        },
      },

      // Assets pequeños inline (< 4 KB)
      assetsInlineLimit: 4096,
    },

    // ─── Soporte WASM ─────────────────────────────────────────────────────────
    optimizeDeps: {
      exclude: ["*.wasm"],       // No pre-bundlear archivos WASM
    },
    assetsInclude: ["**/*.wasm"],

    // ─── Aliases de rutas ─────────────────────────────────────────────────────
    resolve: {
      alias: {
        "@":        resolve(__dirname, "src"),
        "@api":     resolve(__dirname, "src/js/api"),
        "@services":resolve(__dirname, "src/js/api/services"),
        "@modules": resolve(__dirname, "src/js/api/modules"),
        "@assets":  resolve(__dirname, "src/assets"),
        "@css":     resolve(__dirname, "src/assets/css"),
        "@js":      resolve(__dirname, "src/js"),
        "@wasm":    resolve(__dirname, "public/wasm"),
        "@icons":   resolve(__dirname, "public/icons"),
        "@models":  resolve(__dirname, "public/models"),
        "@fonts":   resolve(__dirname, "public/fonts"),
      },
    },

    // ─── Servidor de desarrollo ───────────────────────────────────────────────
    server: {
      port: 5173,
      open: true,
      proxy: {
        // Redirige /api/* al backend durante desarrollo
        "/api": {
          target: env.VITE_API_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // ─── Preview (simula servidor propio en local) ────────────────────────────
    preview: {
      port: 4173,
      strictPort: true,
      headers: {
        // Headers recomendados para WASM en producción
        "Cross-Origin-Opener-Policy":   "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
  };
});