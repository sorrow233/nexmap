import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SEO = ({
    title,
    description,
    keywords,
    image = 'https://nexmap.catzz.work/og-image.png',
    type = 'website'
}) => {
    const location = useLocation();
    const canonicalUrl = `https://nexmap.catzz.work${location.pathname}`;

    // Base title format
    const siteTitle = 'NexMap';
    const fullTitle = title === siteTitle ? title : `${title} - ${siteTitle}`;

    // Default description if none provided
    const defaultDescription = 'Visualize your thoughts with AI. Multi-modal chat, spatial organization, and recursive exploration on an infinite canvas.';
    const finalDescription = description || defaultDescription;

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={finalDescription} />
            {keywords && <meta name="keywords" content={keywords} />}
            <link rel="canonical" href={canonicalUrl} />

            {/* Open Graph */}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={finalDescription} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:type" content={type} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content={siteTitle} />

            {/* Twitter Cards */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={finalDescription} />
            <meta name="twitter:image" content={image} />
        </Helmet>
    );
};

export default SEO;
