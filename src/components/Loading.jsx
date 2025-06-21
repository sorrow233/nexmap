import React from 'react';

const Loading = ({ message = 'Loading...' }) => {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 z-[9999]"
            style={{ backdropFilter: 'blur(4px)' }}>
            <div className="relative w-16 h-16 mb-4">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium animate-pulse">{message}</p>
        </div>
    );
};

export default Loading;
