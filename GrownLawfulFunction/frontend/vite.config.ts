import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@workspace/api-client-react/src/generated/api.schemas": path.resolve(__dirname, "src/api-client/schemas.ts"),
      "@workspace/api-client-react": path.resolve(__dirname, "src/api-client/index.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5000,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/auth": "http://localhost:8000",
      "/api": "http://localhost:8000",
      "/predict": "http://localhost:8000",
      "/history": "http://localhost:8000",
      "/result": "http://localhost:8000",
      "/analytics": "http://localhost:8000",
      "/admin": "http://localhost:8000",
      "/health": "http://localhost:8000",
    },
  },
  preview: {
    port: 5000,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
