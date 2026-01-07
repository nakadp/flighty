import React, { createContext, useState, useContext, useEffect } from 'react';
import en from '../locales/en.json';
import zh from '../locales/zh.json';

const LanguageContext = createContext();

const translations = {
    en,
    'zh-CN': zh,
    zh // fallback
};

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState('en');

    // Load language from local storage on mount
    useEffect(() => {
        const storedLang = localStorage.getItem('app_language');
        if (storedLang && translations[storedLang]) {
            setLanguage(storedLang);
        }
    }, []);

    const changeLanguage = (lang) => {
        if (translations[lang]) {
            setLanguage(lang);
            localStorage.setItem('app_language', lang);
            document.documentElement.lang = lang; // Sync HTML lang attribute
        }
    };

    // Sync on mount
    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const t = (key) => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
