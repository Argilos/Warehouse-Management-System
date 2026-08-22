import React, { useState, useEffect, useRef } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguageStore } from '../../store/useLanguageStore';
import { Language } from '../../lib/translations';

export const LanguageSelector: React.FC = () => {
    const { language, setLanguage } = useLanguageStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const selectLanguage = (lang: Language) => {
        setLanguage(lang);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleDropdown}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-50 border border-surface-200 hover:border-brand-300 hover:bg-brand-50 text-slate-500 hover:text-brand-600 transition-all font-semibold text-xs"
                title="Change Language"
            >
                <span className="uppercase">{language}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white border border-surface-200 rounded-xl shadow-panel z-50 overflow-hidden">
                    <div className="py-1">
                        <button
                            onClick={() => selectLanguage('bs')}
                            className={`w-full flex items-center justify-between px-4 py-2 text-xs transition-colors hover:bg-brand-50 ${language === 'bs' ? 'text-brand-700 bg-brand-50/50' : 'text-slate-600'
                                }`}
                        >
                            <span className="font-semibold">🇧🇦 Bosanski</span>
                            {language === 'bs' && <Check className="w-3.5 h-3.5 text-brand-600" />}
                        </button>
                        <button
                            onClick={() => selectLanguage('en')}
                            className={`w-full flex items-center justify-between px-4 py-2 text-xs transition-colors hover:bg-brand-50 ${language === 'en' ? 'text-brand-700 bg-brand-50/50' : 'text-slate-600'
                                }`}
                        >
                            <span className="font-semibold">🇬🇧 English</span>
                            {language === 'en' && <Check className="w-3.5 h-3.5 text-brand-600" />}
                        </button>
                        <button
                            onClick={() => selectLanguage('de')}
                            className={`w-full flex items-center justify-between px-4 py-2 text-xs transition-colors hover:bg-brand-50 ${language === 'de' ? 'text-brand-700 bg-brand-50/50' : 'text-slate-600'
                                }`}
                        >
                            <span className="font-semibold">🇩🇪 Deutsch</span>
                            {language === 'de' && <Check className="w-3.5 h-3.5 text-brand-600" />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
