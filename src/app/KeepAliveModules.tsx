import { Activity, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { AppModule } from './modules';

function isActivePath(pathname: string, modulePath: string): boolean {
  return pathname === modulePath || pathname.startsWith(`${modulePath}/`);
}

/**
 * 基于 React 19.2 官方 `<Activity>` 的路由缓存宿主（对齐 Vue `<keep-alive>`）：
 * - 模块「首次被访问」时才挂载（懒加载），未访问的不进入 DOM；
 * - 已挂载的模块常驻缓存，切 Tab 时用 `<Activity mode="hidden">`（display:none）隐藏，
 *   React 会保留其 state 与 DOM，仅卸载副作用（effect），切回来自动恢复；
 * - 地图等昂贵引擎在 `useAmapMap` 中按会话级保活，隐藏时不销毁，因此不会重新初始化。
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
          return (
            <Activity key={item.id} mode={item.id === activeId ? 'visible' : 'hidden'}>
              <section className="absolute inset-0 min-h-0 overflow-hidden bg-slate-100">
                <ModuleComponent />
              </section>
            </Activity>
          );
        })}
    </div>
  );
}
