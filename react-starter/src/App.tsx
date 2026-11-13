import { useLanguage } from './contexts/LanguageContext';
import { Layout } from './components/layout/Layout';
import { CTA } from './components/sections/CTA';
import { Features } from './components/sections/Features';
import { Hero } from './components/sections/Hero';
import { Stats } from './components/sections/Stats';

function Dashboard() {
  const { t } = useLanguage();

  return (
    <Layout>
      <div className="dashboard">
        <Hero />
        <Stats />
        <Features />
        <CTA />
        <footer className="app-footer">
          <span>© 2026 SagipRekord</span>
          <span>{t('footerNote')}</span>
          <button type="button">{t('aboutUs')}</button>
        </footer>
      </div>
    </Layout>
  );
}

export default function App() {
  return <Dashboard />;
}
