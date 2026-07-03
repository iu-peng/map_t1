import AmapNavigationPage from '@/pages/AmapNavigation/AmapNavigationPage';
import './navigation-shell.css';

export function NavigationModule() {
  return (
    <section className="navigation-module h-full min-h-0 overflow-hidden rounded-3xl border bg-card shadow-sm">
      <AmapNavigationPage />
    </section>
  );
}
