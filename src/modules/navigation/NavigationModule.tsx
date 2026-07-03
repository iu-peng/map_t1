import AmapNavigationPage from '@/pages/AmapNavigation/AmapNavigationPage';
import './navigation-shell.css';

export function NavigationModule() {
  return (
    <section className="navigation-module h-full min-h-0 overflow-hidden bg-card">
      <AmapNavigationPage />
    </section>
  );
}
