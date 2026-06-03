import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations, defaultLang } from './translations';

const LanguageContext = createContext();

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('app_language') || defaultLang;
    } catch {
      return defaultLang;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_language', lang);
    } catch {}
  }, [lang]);

  const t = useCallback((key, fallback) => {
    const translation = getNestedValue(translations[lang], key);
    if (translation !== undefined) return translation;
    const enFallback = getNestedValue(translations.en, key);
    if (enFallback !== undefined) return enFallback;
    return fallback || key;
  }, [lang]);

  const value = { lang, setLang, t, isHindi: lang === 'hi' };
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
