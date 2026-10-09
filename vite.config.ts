import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwind()],
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes("node_modules/gsap") ? "motion" : undefined,
      },
    },
  },
  server: { port: 5178, strictPort: true },
});
