import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { AppModule } from './modules';

function isActivePath(pathname: string, modulePath: string): boolean {
  return pathname === modulePath || pathname.startsWith(`${modulePath}/`);
}

/**
 * 类似 Vue `<keep-alive>` 的路由缓存宿主：
 * - 每个模块在「首次被访问」时才挂载（懒加载），未访问的模块不进入 DOM；
 * - 一旦挂载便常驻缓存，切换 Tab 时只切换可见性，不再卸载重建；
 * - 因此导航页（含地图实例）在 Tab 间来回切换时不会重新初始化。
 */
export function KeepAliveModules({ modules }: { modules: AppModule[] }) {
  const { pathname } = useLocation();
  const activeModule = modules.find((item) => isActivePath(pathname, item.path));
  const activeId = activeModule?.id;

  const [mountedIds, setMountedIds] = useState<Set<string>>(() => (activeId ? new Set([activeId]) : new Set()));

  useEffect(() => {
    if (!activeId || mountedIds.has(activeId)) return;
    setMountedIds((prev) => new Set(prev).add(activeId));
  }, [activeId, mountedIds]);

  return (
    <div className="absolute inset-x-0 top-0 bottom-[calc(74px+env(safe-area-inset-bottom))] min-h-0 overflow-hidden md:bottom-0">
      {modules
        .filter((item) => mountedIds.has(item.id))
        .map((item) => {
          const ModuleComponent = item.component;
          const active = item.id === activeId;
          return (
            <section
              key={item.id}
              aria-hidden={!active}
              className={cn(
                'absolute inset-0 min-h-0 overflow-hidden bg-slate-100',
                active ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0',
              )}
            >
              <ModuleComponent />
            </section>
          );
        })}
    </div>
  );
}
