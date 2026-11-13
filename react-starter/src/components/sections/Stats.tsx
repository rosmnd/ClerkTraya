import { Archive, Heart, ListChecks, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../ui/Card';

const metrics = [
  { label: 'savedRecords', value: '0', hint: 'savedRecordsHint', icon: Archive },
  { label: 'verifiedRecords', value: '0', hint: 'verifiedRecordsHint', icon: ShieldCheck },
  { label: 'actionSteps', value: '0', hint: 'actionStepsHint', icon: ListChecks, accent: true },
  { label: 'communityFirst', value: '24/7', hint: 'communityFirstHint', icon: Heart },
] as const;

export function Stats() {
  const { t } = useLanguage();

  return (
    <section className="stats-grid" aria-label="Workspace statistics">
      {metrics.map(({ label, value, hint, icon: Icon, ...style }) => (
        <Card className="stat-card" key={label}>
          <span className={`stat-icon ${'accent' in style ? 'is-accent' : ''}`}><Icon size={16} /></span>
          <p>{t(label)}</p>
          <strong>{value}</strong>
          <small>{t(hint)}</small>
        </Card>
      ))}
    </section>
  );
}
