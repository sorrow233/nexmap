import React from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { ContextMenuProvider } from './components/ContextMenu';
import { AppContent } from './app/AppContent';

export default function App() {
    return (
        <ToastProvider>
            <ContextMenuProvider>
                <ErrorBoundary>
                    <AppContent />
                </ErrorBoundary>
            </ContextMenuProvider>
        </ToastProvider>
    );
}

if (typeof window !== 'undefined') window.App = App;
