import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx'
import { LanguageProvider } from './contexts/LanguageContext';
import { setupMobileViewportFix } from './utils/browser.js';
import { installChunkLoadRecovery } from './utils/chunkLoadRecovery.js';
import { stripBuildReloadParams } from './utils/buildVersion.js';
import {
    installFetchErrorLogging,
    installGlobalErrorLogging,
    installRuntimeLoggingControls,
    runtimeLog
} from './utils/runtimeLogging.js';
import './index.css'
import './styles/hljs-theme.css'
import 'katex/dist/katex.min.css'

import packageJson from '../package.json';
installRuntimeLoggingControls();
installGlobalErrorLogging();
installFetchErrorLogging();
stripBuildReloadParams();
runtimeLog(`%c NexMap v${packageJson.version} - Loaded at ${new Date().toISOString()} (build ${__APP_BUILD_TIMESTAMP__})`, 'background: #222; color: #bada55; padding: 4px; border-radius: 4px;');

const syncRootThemeClass = (isDark) => {
    document.documentElement.classList.toggle('dark', Boolean(isDark));
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');
syncRootThemeClass(darkMatcher.matches);

const handleSystemThemeChange = (event) => {
    syncRootThemeClass(event.matches);
};

if (typeof darkMatcher.addEventListener === 'function') {
    darkMatcher.addEventListener('change', handleSystemThemeChange);
} else if (typeof darkMatcher.addListener === 'function') {
    darkMatcher.addListener(handleSystemThemeChange);
}

// Initialize iOS Safari 100vh viewport fix
setupMobileViewportFix();
installChunkLoadRecovery();


// Prevent browser navigation gestures globally
// This is critical for canvas-based apps where swipe gestures should not trigger browser back/forward
let touchStartX = 0;
let touchStartY = 0;
let touchStartedNearEdge = false;
const EDGE_SWIPE_GUARD_PX = 24;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartedNearEdge =
        touchStartX <= EDGE_SWIPE_GUARD_PX ||
        touchStartX >= window.innerWidth - EDGE_SWIPE_GUARD_PX;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (!touchStartedNearEdge) return;

    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    const deltaX = Math.abs(touchEndX - touchStartX);
    const deltaY = Math.abs(touchEndY - touchStartY);

    // If horizontal swipe is dominant, prevent default to stop navigation
    if (deltaX > deltaY && deltaX > 30) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchend', () => {
    touchStartedNearEdge = false;
}, { passive: true });

document.addEventListener('touchcancel', () => {
    touchStartedNearEdge = false;
}, { passive: true });

// Prevent mouse wheel from triggering browser navigation
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <HelmetProvider>
            <BrowserRouter>
                <LanguageProvider>
                    <App />
                </LanguageProvider>
            </BrowserRouter>
        </HelmetProvider>
    </React.StrictMode>,
)
