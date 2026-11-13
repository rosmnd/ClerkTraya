import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import english from '../locales/en.json';
import tagalog from '../locales/tag.json';

export type Language = 'en' | 'tag';
export type TranslationKey = keyof typeof english;

const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  en: english,
  tag: tagalog,
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => dictionaries[language][key],
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider.');
  }
  return context;
}
