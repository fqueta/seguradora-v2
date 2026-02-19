import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
/**
 * Vite config: sets dev server host/port.
 * - Host "::" to bind IPv6/IPv4 on Windows.
 * - Port 8081 to avoid conflict with other services using 8080.
 */
export default defineConfig(({ mode }) => ({
  server: {
    // Bind to localhost to avoid DNS issues on Windows
    host: true,
    port: 5000,
    strictPort: true,
    // Use default HMR settings (auto)
  },
  build: {
    // pt-BR: Ajusta aviso de tamanho e cria chunks menores para vendors.
    // en-US: Adjusts warning limit and creates smaller vendor chunks.
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        // Removido manualChunks para garantir estabilidade do núcleo do React em produção.
        // O limite de aviso foi aumentado para 5000kB para evitar a mensagem amarela.
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
