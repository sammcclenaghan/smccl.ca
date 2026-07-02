// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import sitemap from "@astrojs/sitemap";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    // Fix HMR issues with Bun
    server: {
      watch: {
        usePolling: true,
      },
    },
    // Prevent caching issues
    optimizeDeps: {
      exclude: ["astro:content"],
    },
  },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "poimandres",
      },
    },
  },
  site: "https://smccl.ca/",
  integrations: [sitemap()],
  experimental: {
    queuedRendering: {
      enabled: true,
    },
  },
});
