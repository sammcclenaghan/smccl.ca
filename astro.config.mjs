// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import sitemap from "@astrojs/sitemap";

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
    shikiConfig: {
      theme: "dracula",
    },
  },
  site: "https://samcclenaghan.netlify.app/",
  integrations: [sitemap()],
});
