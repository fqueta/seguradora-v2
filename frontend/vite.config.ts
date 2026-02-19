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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group EVERYTHING React-dependent together for safety
            if (
              id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/') ||
              id.includes('node_modules/react-router/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/@radix-ui/') ||
              id.includes('node_modules/react-hook-form/') ||
              id.includes('node_modules/@hookform/') ||
              id.includes('node_modules/lucide-react/') ||
              id.includes('node_modules/@tanstack/') ||
              id.includes('node_modules/recharts/') ||
              id.includes('node_modules/embla-carousel-react/') ||
              id.includes('node_modules/sonner/') ||
              id.includes('node_modules/vaul/') ||
              id.includes('node_modules/input-otp/') ||
              id.includes('node_modules/date-fns/')
            ) {
              return 'vendor-react-core';
            }
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('jspdf')) return 'vendor-pdf';
            if (id.includes('zod')) return 'vendor-validation';
            if (id.includes('@supabase')) return 'vendor-supabase';
            return 'vendor'; // All other node_modules
          }
        },
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
