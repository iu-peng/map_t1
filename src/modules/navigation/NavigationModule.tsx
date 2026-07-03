import { useEffect, useRef } from 'react';
import AmapNavigationPage from '@/pages/AmapNavigation/AmapNavigationPage';
import './navigation-shell.css';

function hasReadyRoutePoints(root: HTMLElement) {
  const selectedText = root.querySelector('.amap-route-selected')?.textContent || '';
  return Boolean(selectedText && !selectedText.includes('起点：-') && !selectedText.includes('终点：-'));
}

function clickPlanButton(root: HTMLElement) {
  const planButton = root.querySelector<HTMLButtonElement>('.amap-route-actions button:first-child');
  if (!planButton || planButton.disabled) return;
  planButton.click();
}

export function NavigationModule() {
  const rootRef = useRef<HTMLElement | null>(null);
  const autoPlanTimerRef = useRef<number | null>(null);
  const configOpenedWithRoutePointsRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const clearAutoPlanTimer = () => {
      if (autoPlanTimerRef.current) {
        window.clearTimeout(autoPlanTimerRef.current);
        autoPlanTimerRef.current = null;
      }
    };

    const scheduleAutoPlan = (force = false) => {
      clearAutoPlanTimer();
      autoPlanTimerRef.current = window.setTimeout(() => {
        autoPlanTimerRef.current = null;
        if (!force && !hasReadyRoutePoints(root)) return;
        clickPlanButton(root);
      }, 120);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('.amap-route-mode button')) {
        scheduleAutoPlan(false);
        return;
      }

      const headerButton = target.closest('.amap-route-header-actions button');
      if (headerButton?.textContent?.includes('配置')) {
        configOpenedWithRoutePointsRef.current = hasReadyRoutePoints(root);
        return;
      }

      const confirmConfigButton = target.closest('.amap-route-config__actions button:last-child');
      if (confirmConfigButton && configOpenedWithRoutePointsRef.current) {
        scheduleAutoPlan(true);
      }
    };

    root.addEventListener('click', handleClick);
    return () => {
      clearAutoPlanTimer();
      root.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <section ref={rootRef} className="navigation-module h-full min-h-0 overflow-hidden bg-card">
      <AmapNavigationPage />
    </section>
  );
}
