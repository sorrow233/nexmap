import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        chunkSizeWarningLimit: 1000,
        cssCodeSplit: true,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // Core React
                    if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
                        return 'vendor-react';
                    }
                    // Router
                    if (id.includes('node_modules/react-router')) {
                        return 'vendor-router';
                    }
                    // State management
                    if (id.includes('node_modules/zustand') || id.includes('node_modules/zundo')) {
                        return 'vendor-state';
                    }

                    // Firebase - use specific subpackages
                    if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
                        return 'vendor-firebase';
                    }
                    // Heavy utilities
                    if (id.includes('node_modules/html2canvas') || id.includes('node_modules/html-to-image')) {
                        return 'vendor-canvas';
                    }
                }
            }
        }
    }
})
