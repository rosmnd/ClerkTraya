import { LifeBuoy } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { BurgerMenu } from './BurgerMenu';

interface HeaderProps {
  sidebarExpanded: boolean;
  mobileOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({ sidebarExpanded, mobileOpen, onToggleSidebar }: HeaderProps) {
  const { t } = useLanguage();

  return (
    <header className="topbar">
      <Button
        className="menu-toggle menu-toggle--mobile"
        variant="ghost"
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar"
        onClick={onToggleSidebar}
      >
        <BurgerMenu open={mobileOpen} />
      </Button>
      <a className="brand-lockup" href="/" aria-label="SagipRekord home">
        <span className="brand-mark"><LifeBuoy size={19} aria-hidden="true" /></span>
        <span className="brand-copy">
          <strong>SagipRekord</strong>
          <small>Community records, made clear</small>
        </span>
      </a>
      <div className="topbar-actions">
        <span className="workspace-status"><span className="status-dot" />{t('secureWorkspace')}</span>
        <LanguageSwitcher />
        <Button
          className="menu-toggle menu-toggle--desktop"
          variant="ghost"
          type="button"
          aria-label={sidebarExpanded ? 'Collapse navigation' : 'Expand navigation'}
          aria-expanded={sidebarExpanded}
          aria-controls="app-sidebar"
          onClick={onToggleSidebar}
        >
          <BurgerMenu open={!sidebarExpanded} />
        </Button>
      </div>
    </header>
  );
}
