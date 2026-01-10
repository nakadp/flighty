import React, { createContext, useState, useContext, useEffect } from 'react';
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import es from '../locales/es.json';
import hi from '../locales/hi.json';
import fr from '../locales/fr.json';
import ar from '../locales/ar.json';
import bn from '../locales/bn.json';
import pt from '../locales/pt.json';
import ru from '../locales/ru.json';
import ur from '../locales/ur.json';
import id from '../locales/id.json';
import de from '../locales/de.json';
import ja from '../locales/ja.json';
import ko from '../locales/ko.json';
import tr from '../locales/tr.json';
import vi from '../locales/vi.json';
import it from '../locales/it.json';
import th from '../locales/th.json';
import pl from '../locales/pl.json';
import nl from '../locales/nl.json';
import si from '../locales/si.json';

const LanguageContext = createContext();

export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'th', name: 'Thai', nativeName: 'ไทย' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
    { code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
];

const translations = {
    en,
    'zh-CN': zh,
    zh, // fallback
    es,
    hi,
    fr,
    ar,
    bn,
    pt,
    ru,
    ur,
    id,
    de,
    ja,
    ko,
    tr,
    vi,
    it,
    th,
    pl,
    nl,
    si
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

            // Handle RTL for Arabic/Urdu if needed
            if (['ar', 'ur'].includes(lang)) {
                document.documentElement.dir = 'rtl';
            } else {
                document.documentElement.dir = 'ltr';
            }
        }
    };

    // Sync on mount
    useEffect(() => {
        document.documentElement.lang = language;
        if (['ar', 'ur'].includes(language)) {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
    }, [language]);

    const t = (key) => {
        return translations[language]?.[key] || translations['en']?.[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
