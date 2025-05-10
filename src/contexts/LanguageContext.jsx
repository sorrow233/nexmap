import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('en');

    useEffect(() => {
        const detectLanguage = async () => {
            // 1. Check Browser Language
            // If Browser is Chinese, we treat them as a Chinese user (Browser Primary)
            const navLang = navigator.language || navigator.userLanguage;
            if (navLang && (navLang.toLowerCase().includes('zh'))) {
                setLanguage('zh');
                return;
            }

            // 2. Check IP Location for "Overseas Users" (IP Primary)
            // If they are not Chinese-browser users, we check their IP.
            try {
                // Using ipapi.co as a lightweight IP check
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                const country = data.country_code; // 'JP', 'CN', 'US', etc.

                if (country === 'JP') {
                    setLanguage('ja');
                } else if (country === 'CN') {
                    // Fallback: If browser wasn't zh but IP is CN (unlikely but possible)
                    setLanguage('zh');
                } else {
                    // Default to English for other regions
                    setLanguage('en');
                }
            } catch (error) {
                console.warn('IP detection failed, falling back to browser language or English', error);
                // Fallback Logic if IP fails
                if (navLang && navLang.toLowerCase().includes('ja')) {
                    setLanguage('ja');
                } else {
                    setLanguage('en');
                }
            }
        };

        detectLanguage();
    }, []);

    const t = translations[language] || translations['en'];

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
