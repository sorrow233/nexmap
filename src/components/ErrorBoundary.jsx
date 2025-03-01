import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default level: 'fullscreen' | 'canvas' | 'card'
            const level = this.props.level || 'fullscreen';

            if (level === 'card') {
                return (
                    <div className="flex flex-col items-center justify-center p-4 bg-red-50 border-2 border-dashed border-red-200 rounded-xl w-full h-full min-h-[100px] text-red-600">
                        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs font-medium text-center">Card Render Error</span>
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="mt-2 text-[10px] underline uppercase tracking-tighter opacity-70 hover:opacity-100"
                        >
                            Try Again
                        </button>
                    </div>
                );
            }

            if (level === 'canvas') {
                return (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50 dark:bg-slate-900 text-slate-400">
                        <AlertCircle className="w-12 h-12 mb-4 text-red-400" />
                        <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">Canvas Rendering Failed</h3>
                        <p className="text-sm mt-1 mb-6 max-w-md text-center opacity-70">
                            The drawing surface encountered an error. This won't affect your other boards.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reload App
                            </button>
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Retry Canvas
                            </button>
                        </div>
                    </div>
                );
            }

            // Fallback for fullscreen (App Level)
            return (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-red-100 dark:border-red-900/30 max-w-2xl w-full mx-4 shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400">
                                <AlertCircle className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Something went wrong</h2>
                                <p className="text-slate-500 dark:text-slate-400">The application encountered an unexpected error.</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 mb-8 max-h-[40vh] overflow-auto">
                            <pre className="text-xs text-red-600 font-mono leading-relaxed">
                                {this.state.error?.toString()}
                                {"\n\n"}
                                {this.state.error?.stack}
                            </pre>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2.5 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
