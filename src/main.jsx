import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx'
import { LanguageProvider } from './contexts/LanguageContext';
import { setupMobileViewportFix } from './utils/browser.js';
import { installChunkLoadRecovery } from './utils/chunkLoadRecovery.js';
import { stripBuildReloadParams } from './utils/buildVersion.js';
import { startSystemThemeSync } from './utils/theme.js';
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
startSystemThemeSync();

// Initialize iOS Safari 100vh viewport fix
setupMobileViewportFix();
installChunkLoadRecovery();


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
