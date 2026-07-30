import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, Language } from '../lib/translations';

interface LanguageState {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

export const useLanguageStore = create<LanguageState>()(
    persist(
        (set, get) => ({
            language: 'bs',
            setLanguage: (lang) => set({ language: lang }),
            t: (key) => translations[get().language]?.[key] ?? key,
        }),
        {
            name: 'language-storage',
        }
    )
);
