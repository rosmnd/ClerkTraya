import type { ReactNode } from 'react';
import { useSidebar } from '../../hooks/useSidebar';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const sidebar = useSidebar();
  const expanded = sidebar.isMobile ? false : sidebar.isExpanded;

  return (
    <div className={`app-shell min-h-screen bg-palette-background text-palette-heading ${expanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      <Header
        sidebarExpanded={sidebar.isMobile ? sidebar.isMobileOpen : sidebar.isExpanded}
        mobileOpen={sidebar.isMobileOpen}
        onToggleSidebar={sidebar.toggle}
      />
      <Sidebar
        expanded={expanded}
        mobileOpen={sidebar.isMobileOpen}
        onNavigate={sidebar.closeMobile}
      />
      <main className="main-content">{children}</main>
    </div>
  );
}
