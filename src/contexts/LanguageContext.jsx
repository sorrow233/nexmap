import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        // Initialize with logic to detect language immediately
        try {
            // 1. Check LocalStorage (User Preference)
            const savedLang = localStorage.getItem('userLanguage');
            if (savedLang && ['en', 'zh', 'ja', 'ko'].includes(savedLang)) {
                return savedLang;
            }

            // 2. Check Browser Language
            const navLang = navigator.language || navigator.userLanguage;
            if (navLang) {
                const lowerLang = navLang.toLowerCase();
                if (lowerLang.includes('zh')) {
                    return 'zh';
                } else if (lowerLang.includes('ja')) {
                    return 'ja';
                } else if (lowerLang.includes('ko')) {
                    return 'ko';
                }
            }
        } catch (e) {
            console.error("Error initializing language:", e);
        }

        // 3. Default fallback
        return 'en';
    });

    const t = translations[language] || translations['en'];

    // Persist language selection to localStorage
    useEffect(() => {
        localStorage.setItem('userLanguage', language);
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
