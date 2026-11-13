import { ArrowRight, FileCheck2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';

export function CTA() {
  const { t } = useLanguage();

  return (
    <section className="cta-banner">
      <span className="cta-icon"><FileCheck2 size={20} /></span>
      <div>
        <p className="eyebrow">{t('ctaEyebrow')}</p>
        <h2>{t('ctaTitle')}</h2>
        <p className="cta-copy">{t('ctaCopy')}</p>
      </div>
      <Button variant="secondary" type="button">{t('getStarted')}<ArrowRight size={14} /></Button>
    </section>
  );
}
