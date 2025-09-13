import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

const NotFound = () => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
            <Helmet>
                <title>404 - Page Not Found | NexMap</title>
                <meta name="robots" content="noindex" />
                <meta name="description" content="The page you are looking for does not exist." />
            </Helmet>

            <h1 className="text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                404
            </h1>
            <h2 className="mt-4 text-3xl font-semibold text-gray-800 dark:text-gray-100">
                Page Not Found
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-md">
                Oops! The page you are looking for seems to have wandered off into the infinite canvas.
            </p>

            <Link
                to="/"
                className="mt-8 flex items-center gap-2 px-6 py-3 text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
                <Home size={20} />
                <span>Return to Home</span>
            </Link>
        </div>
    );
};

export default NotFound;
