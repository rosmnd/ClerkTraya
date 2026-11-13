import { ArrowRight, Check, FileCheck2, MapPin } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';

export function Hero() {
  const { t } = useLanguage();

  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-dot" />{t('welcomeEyebrow')}</p>
        <h1>{t('welcomeTitle')}<br /><span>{t('welcomeSubtitle')}</span></h1>
        <p className="hero-description">{t('welcomeCopy')}</p>
        <Button type="button">
          <FileCheck2 size={16} aria-hidden="true" />{t('startDocument')}<ArrowRight size={15} aria-hidden="true" />
        </Button>
      </div>
      <div className="hero-art" aria-hidden="true">
        <span className="orbit orbit-one" />
        <span className="orbit orbit-two" />
        <span className="art-sparkle sparkle-one">✦</span>
        <span className="art-sparkle sparkle-two">✧</span>
        <div className="globe-card">
          <svg viewBox="0 0 170 170">
            <defs>
              <linearGradient id="globe-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#DFE9FF" />
              </linearGradient>
            </defs>
            <circle cx="85" cy="85" r="67" fill="url(#globe-fill)" />
            <ellipse cx="85" cy="85" rx="31" ry="67" fill="none" stroke="#A58AE8" strokeWidth="2" opacity=".65" />
            <ellipse cx="85" cy="85" rx="59" ry="24" fill="none" stroke="#4378E4" strokeWidth="2" opacity=".4" />
            <path d="M21 85h128M85 19v132" stroke="#4378E4" strokeWidth="1.5" opacity=".25" />
            <path d="M51 54c9-8 19-9 24-3l-5 10 10 5-6 10-13-3-7 11-11-3-7-12 8-15zM101 91l15-8 14 8-4 14-13 8-9-9zM66 110l12 6 6 18-12 4-9-12z" fill="#A58AE8" opacity=".8" />
            <circle cx="128" cy="53" r="7" fill="#3364E1" />
          </svg>
          <span className="globe-label"><MapPin size={11} /> PALATIW, PASIG</span>
        </div>
        <div className="floating-note">
          <span className="note-check"><Check size={14} /></span>
          <span><strong>Records protected</strong><small>Ready when you need them</small></span>
        </div>
      </div>
    </section>
  );
}
