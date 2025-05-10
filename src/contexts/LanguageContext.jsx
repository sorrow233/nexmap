import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('en');

    useEffect(() => {
        const detectLanguage = () => {
            // Simply check Browser Language
            const navLang = navigator.language || navigator.userLanguage;

            if (navLang) {
                const lowerLang = navLang.toLowerCase();
                if (lowerLang.includes('zh')) {
                    setLanguage('zh');
                } else if (lowerLang.includes('ja')) {
                    setLanguage('ja');
                } else {
                    setLanguage('en');
                }
            } else {
                setLanguage('en');
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
