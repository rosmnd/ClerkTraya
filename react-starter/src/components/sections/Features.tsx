import { ArrowRight, Archive, ClipboardCheck, WandSparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../ui/Card';

const features = [
  { number: '01', title: 'featureScanTitle', copy: 'featureScanCopy', link: 'scanDocument', icon: WandSparkles },
  { number: '02', title: 'featureVerifyTitle', copy: 'featureVerifyCopy', link: 'reviewDetails', icon: ClipboardCheck, accent: true },
  { number: '03', title: 'featureOrganizeTitle', copy: 'featureOrganizeCopy', link: 'openVault', icon: Archive },
] as const;

export function Features() {
  const { t } = useLanguage();

  return (
    <section className="features-section">
      <div className="section-heading">
        <div><p className="eyebrow">{t('simpleTools')}</p><h2>{t('toolsTitle')}</h2></div>
        <button className="text-link" type="button">{t('exploreHub')} <ArrowRight size={14} /></button>
      </div>
      <div className="feature-grid">
        {features.map(({ number, title, copy, link, icon: Icon, ...style }) => (
          <Card className="feature-card" key={number}>
            <span className={`feature-icon ${'accent' in style ? 'is-accent' : ''}`}><Icon size={17} /></span>
            <span className="feature-number">{number}</span>
            <h3>{t(title)}</h3>
            <p>{t(copy)}</p>
            <button type="button">{t(link)} <ArrowRight size={12} /></button>
          </Card>
        ))}
      </div>
    </section>
  );
}
