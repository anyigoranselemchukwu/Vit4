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
      "/api": { target: "http://localhost:8000", ws: true },
      "/predict": "http://localhost:8000",
      "/history": "http://localhost:8000",
      "/result": "http://localhost:8000",
      "/results": "http://localhost:8000",
      "/analytics": "http://localhost:8000",
      "/admin": "http://localhost:8000",
      "/health": "http://localhost:8000",
      "/training": "http://localhost:8000",
      "/odds": "http://localhost:8000",
      "/ai": "http://localhost:8000",
      "/system": "http://localhost:8000",
      "/fetch": "http://localhost:8000",
      "/subscription": "http://localhost:8000",
      "/audit": "http://localhost:8000",
      "/wallet": "http://localhost:8000",
      "/blockchain": "http://localhost:8000",
      "/marketplace": "http://localhost:8000",
      "/trust": "http://localhost:8000",
      "/bridge": "http://localhost:8000",
      "/developer": "http://localhost:8000",
      "/governance": "http://localhost:8000",
      "/notifications": "http://localhost:8000",
      "/pipeline": "http://localhost:8000",
      "/oracle": "http://localhost:8000",
      "/webhook": "http://localhost:8000",
      "/ws": { target: "ws://localhost:8000", ws: true },
    },
  },
  preview: {
    port: 5000,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
