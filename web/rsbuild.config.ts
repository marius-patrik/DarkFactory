import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";

const { publicVars } = loadEnv();

export default defineConfig({
  plugins: [pluginReact(), pluginTailwindcss()],
  source: {
    define: publicVars,
    entry: {
      index: "./src/main.tsx",
    },
  },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
  html: {
    inject: "body",
    template: "./index.html",
  },
  output: {
    assetPrefix: "./",
    distPath: {
      root: "dist",
    },
    cleanDistPath: true,
  },
  server: {
    host: "0.0.0.0",
  },
});
