import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const packageJson = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);

function buildVersionManifestPlugin() {
    return {
        name: 'build-version-manifest',
        generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: 'version.json',
                source: JSON.stringify({
                    version: packageJson.version,
                    builtAt: new Date().toISOString()
                }, null, 2)
            });
        }
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), buildVersionManifestPlugin()],
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
