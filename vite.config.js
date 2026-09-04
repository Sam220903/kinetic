import { defineConfig, loadEnv } from "vite";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: env.VITE_BASE_URL || "/",

    root: ".",
    publicDir: "public",

    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: false,
      minify: "oxc",

      rollupOptions: {
        // ─── Entradas: todos los HTML del proyecto ──────────────────────────
        input: {
          main:        resolve(__dirname, "index.html"),
          routines:    resolve(__dirname, "routines.html"),
          liveSession: resolve(__dirname, "live-session.html"),
        },

        output: {
          entryFileNames: "assets/js/[name]-[hash].js",
          chunkFileNames: "assets/js/[name]-[hash].js",
          assetFileNames: ({ name }) => {
            if (/\.(woff2?|ttf|otf|eot)$/i.test(name))
              return "assets/fonts/[name]-[hash][extname]";
            if (/\.(png|jpe?g|svg|gif|webp|ico)$/i.test(name))
              return "assets/icons/[name]-[hash][extname]";
            if (/\.css$/i.test(name))
              return "assets/css/[name]-[hash][extname]";
            return "assets/[name]-[hash][extname]";
          },

          // ─── Code-splitting manual ────────────────────────────────────────
          manualChunks(id) {
            // Librerías externas en un chunk separado para mejor caché
            if (id.includes("node_modules"))               return "vendor";
            // Tu capa de API separada — se cachea independiente de la UI
            if (id.includes("/src/js/api/services/"))      return "api-services";
            if (id.includes("/src/js/api/modules/"))       return "api-modules";
            if (id.includes("/src/js/api/apiClient"))      return "api-client";
          },
        },
      },

      assetsInlineLimit: 4096,
    },

    // ─── WASM: excluir del pre-bundling, incluir como asset ─────────────────
    optimizeDeps: {
      exclude: ["@mediapipe/tasks-vision"],
    },
    assetsInclude: ["**/*.wasm", "**/*.task"],

    // ─── Aliases — coinciden exactamente con tu estructura en /src ───────────
    resolve: {
      alias: {
        "@":         resolve(__dirname, "src"),
        "@assets":   resolve(__dirname, "src/assets"),
        "@css":      resolve(__dirname, "src/assets/css"),
        "@js":       resolve(__dirname, "src/js"),
        "@api":      resolve(__dirname, "src/js/api"),
        "@services": resolve(__dirname, "src/js/api/services"),
        "@modules":  resolve(__dirname, "src/js/api/modules"),
      },
    },

    // ─── Dev server ──────────────────────────────────────────────────────────
    server: {
      port: 5173,
      open: true,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // ─── Preview ─────────────────────────────────────────────────────────────
    preview: {
      port: 4173,
      strictPort: true,
      headers: {
        "Cross-Origin-Opener-Policy":   "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
  };
});
