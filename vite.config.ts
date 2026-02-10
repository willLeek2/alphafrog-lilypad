import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 31127,
  },
  preview: {
    port: 31127,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@xyflow/react', 'lucide-react', 'date-fns', 'zustand'],
        },
      },
    },
  },
});
