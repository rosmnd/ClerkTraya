import { Archive, CircleHelp, Grid2X2, Handshake, LifeBuoy, WandSparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface SidebarProps {
  expanded: boolean;
  mobileOpen: boolean;
  onNavigate: () => void;
}

const navigation = [
  { key: 'overview', icon: Grid2X2, current: true },
  { key: 'documentWizard', icon: WandSparkles },
  { key: 'recordsVault', icon: Archive, count: '0' },
  { key: 'communityHub', icon: Handshake },
] as const;

export function Sidebar({ expanded, mobileOpen, onNavigate }: SidebarProps) {
  const { t } = useLanguage();

  return (
    <>
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'is-visible' : ''}`}
        onClick={onNavigate}
        aria-hidden="true"
      />
      <aside
        id="app-sidebar"
        className={`sidebar ${expanded ? 'is-expanded' : 'is-collapsed'} ${mobileOpen ? 'is-mobile-open' : ''}`}
        aria-label="Main navigation"
      >
        <p className="sidebar-caption">{t('workspace')}</p>
        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const current = 'current' in item && item.current;
            const count = 'count' in item ? item.count : null;

            return (
              <button
                key={item.key}
                type="button"
                className={`sidebar-link ${current ? 'is-active' : ''}`}
                aria-current={current ? 'page' : undefined}
                title={!expanded ? t(item.key) : undefined}
                onClick={onNavigate}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{t(item.key)}</span>
                {count && <span className="sidebar-count">{count}</span>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-help">
          <span className="help-icon"><CircleHelp size={17} aria-hidden="true" /></span>
          <strong>{t('needHelp')}</strong>
          <p>{t('helpCopy')}</p>
          <button type="button" onClick={onNavigate}>{t('learnMore')} <span aria-hidden="true">→</span></button>
        </div>
        <div className="sidebar-profile">
          <span className="profile-avatar">P</span>
          <span className="profile-copy"><strong>Palatiw DRRMO</strong><small>{t('community')}</small></span>
          <LifeBuoy className="profile-mark" size={16} aria-hidden="true" />
        </div>
      </aside>
    </>
  );
}
