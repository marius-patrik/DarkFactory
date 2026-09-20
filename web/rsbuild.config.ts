import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";

export default defineConfig({
  plugins: [pluginReact(), pluginTailwindcss()],
  source: {
    entry: {
      index: "./src/main.tsx",
      viewer: "./src/main.tsx",
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
  tools: {
    htmlPlugin(config, { entryName }) {
      config.template = entryName === "viewer" ? "./viewer.html" : "./index.html";
    },
  },
});
