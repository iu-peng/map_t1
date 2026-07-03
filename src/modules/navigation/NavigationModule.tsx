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

function keepDrawerOpen(root: HTMLElement) {
  const panel = root.querySelector('.amap-route-panel');
  const trigger = root.querySelector<HTMLButtonElement>('.amap-route-mobile-trigger');
  if (!panel || panel.classList.contains('is-open')) return;
  panel.classList.add('is-open');
  trigger?.click();
}

export function NavigationModule() {
  const rootRef = useRef<HTMLElement | null>(null);
  const autoPlanTimerRef = useRef<number | null>(null);
  const keepDrawerUntilRef = useRef(0);
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

    const keepDrawerDuringPlanning = () => {
      keepDrawerUntilRef.current = Date.now() + 4500;
      keepDrawerOpen(root);
    };

    const observer = new MutationObserver(() => {
      if (Date.now() > keepDrawerUntilRef.current) return;
      keepDrawerOpen(root);
    });

    const observePanel = () => {
      const panel = root.querySelector('.amap-route-panel');
      if (panel) observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
    };

    observePanel();

    const scheduleAutoPlan = (force = false) => {
      clearAutoPlanTimer();
      autoPlanTimerRef.current = window.setTimeout(() => {
        autoPlanTimerRef.current = null;
        if (!force && !hasReadyRoutePoints(root)) return;
        keepDrawerDuringPlanning();
        clickPlanButton(root);
      }, 120);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('.amap-route-card__close') || target.closest('.amap-route-mobile-mask')) {
        keepDrawerUntilRef.current = 0;
        return;
      }

      if (target.closest('.amap-route-actions button:first-child')) {
        keepDrawerDuringPlanning();
        return;
      }

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
      observer.disconnect();
      root.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <section ref={rootRef} className="navigation-module h-full min-h-0 overflow-hidden bg-card">
      <AmapNavigationPage />
    </section>
  );
}
