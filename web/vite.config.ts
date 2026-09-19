import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(fileURLToPath(new URL(".", import.meta.url)), "index.html"),
        viewer: resolve(fileURLToPath(new URL(".", import.meta.url)), "viewer.html"),
      },
    },
  },
});
