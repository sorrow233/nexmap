import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

console.log(`%c MixBoard Canvas v0.0.2 (Beta - Fixes ID Collisions) - Loaded at ${new Date().toISOString()}`, 'background: #222; color: #bada55; padding: 4px; border-radius: 4px;');


// Prevent browser navigation gestures globally
// This is critical for canvas-based apps where swipe gestures should not trigger browser back/forward
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    const deltaX = Math.abs(touchEndX - touchStartX);
    const deltaY = Math.abs(touchEndY - touchStartY);

    // If horizontal swipe is dominant, prevent default to stop navigation
    if (deltaX > deltaY && deltaX > 30) {
        e.preventDefault();
    }
}, { passive: false });

// Prevent mouse wheel from triggering browser navigation
document.addEventListener('wheel', (e) => {
    // Only prevent if it looks like a navigation gesture (horizontal scroll)
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
    }
}, { passive: false });

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <LanguageProvider>
                <App />
            </LanguageProvider>
        </BrowserRouter>
    </React.StrictMode>,
)
