import { cn } from '@/lib/utils';
import { MapFloatingControls } from './components/MapFloatingControls';
import { RoutePanel } from './components/RoutePanel';
import { useNavigation } from './hooks/useNavigation';
import './navigation.css';

/**
 * 导航功能根组件：左侧全屏地图 + 右侧可滑出的路线抽屉。
 * 所有状态与副作用集中在 `useNavigation`，本组件只负责布局与组合。
 */
export function NavigationModule() {
  const controller = useNavigation();
  const { panelOpen, configOpen } = controller;

  return (
    <section className="amap-map-root relative h-full min-h-0 overflow-hidden bg-card">
      <div
        ref={controller.mapContainerRef}
        className={cn('absolute inset-0 h-full w-full', panelOpen && 'pointer-events-none')}
      />

      <MapFloatingControls
        hidden={panelOpen}
        onOpenPanel={controller.openPanel}
        onLocate={controller.locateCurrentPosition}
      />

      {/* 遮罩：展开抽屉时点击关闭。 */}
      <div
        className={cn(
          'absolute inset-0 z-[70] bg-slate-900/30 transition-opacity duration-200',
          panelOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={controller.closePanel}
      />

      {/* 路线抽屉。 */}
      <div
        className={cn(
          'absolute inset-y-0 right-0 z-[80] w-[90vw] max-w-[420px] transition-transform ease-out [transition-duration:250ms] md:w-[min(392px,34vw)]',
          panelOpen ? 'translate-x-0' : 'translate-x-[110%]',
        )}
      >
        {panelOpen && !configOpen && (
          <button
            type="button"
            onClick={controller.closePanel}
            aria-label="关闭路线面板"
            className="absolute left-[-52px] top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-[#d6dee9] bg-white/95 text-2xl leading-none text-[#475569] shadow-[0_10px_24px_rgba(15,23,42,0.18)] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
          >
            ×
          </button>
        )}
        <RoutePanel controller={controller} />
      </div>
    </section>
  );
}
