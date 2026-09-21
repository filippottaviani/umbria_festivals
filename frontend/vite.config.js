import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: [
      '@capacitor/core',
      '@capacitor/status-bar',
      '@capacitor/geolocation',
      '@capacitor/app',
      '@capacitor/splash-screen'
    ]
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@fullcalendar')) {
              return 'vendor-fullcalendar';
            }
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-leaflet';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            return 'vendor-misc';
          }
        }
      }
    }
  }
});
