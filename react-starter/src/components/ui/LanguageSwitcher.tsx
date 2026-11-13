import { useLanguage, type Language } from '../../contexts/LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="language-switch" role="group" aria-label="Choose language">
      {(['en', 'tag'] as const).map((option: Language) => (
        <button
          key={option}
          type="button"
          className={`language-option ${language === option ? 'is-selected' : ''}`}
          aria-pressed={language === option}
          onClick={() => setLanguage(option)}
        >
          {option === 'en' ? 'ENG' : 'TAG'}
        </button>
      ))}
    </div>
  );
}
