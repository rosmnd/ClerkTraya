import { useCallback, useEffect, useState } from 'react';

const DESKTOP_QUERY = '(min-width: 1024px)';
const MOBILE_QUERY = '(max-width: 639px)';

export function useSidebar() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const [isExpanded, setIsExpanded] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia(DESKTOP_QUERY);
    const mobileQuery = window.matchMedia(MOBILE_QUERY);

    const syncBreakpoints = () => {
      setIsDesktop(desktopQuery.matches);
      setIsMobile(mobileQuery.matches);
      setIsExpanded(desktopQuery.matches);
      setIsMobileOpen(false);
    };

    syncBreakpoints();
    desktopQuery.addEventListener('change', syncBreakpoints);
    mobileQuery.addEventListener('change', syncBreakpoints);
    return () => {
      desktopQuery.removeEventListener('change', syncBreakpoints);
      mobileQuery.removeEventListener('change', syncBreakpoints);
    };
  }, []);

  const toggle = useCallback(() => {
    if (isMobile) setIsMobileOpen((open) => !open);
    else setIsExpanded((expanded) => !expanded);
  }, [isMobile]);

  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  return {
    isDesktop,
    isMobile,
    isExpanded,
    isMobileOpen,
    toggle,
    closeMobile,
  };
}
