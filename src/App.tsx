import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/app/layout/Sidebar';
import { MobileTabBar } from '@/app/layout/MobileTabBar';
import { APP_MODULES, type AppModuleId } from '@/app/modules';

export default function App() {
  const [activeModuleId, setActiveModuleId] = useState<AppModuleId>('navigation');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-slate-950">
      <Sidebar
        modules={APP_MODULES}
        activeId={activeModuleId}
        collapsed={sidebarCollapsed}
        onSelect={setActiveModuleId}
        onCollapsedChange={setSidebarCollapsed}
      />

      <main className="relative min-w-0 flex-1 overflow-hidden bg-slate-100">
        {/* 全部模块常驻挂载（保活），仅切换可见性，避免地图等重资源反复初始化。 */}
        <div className="absolute inset-x-0 top-0 bottom-[calc(74px+env(safe-area-inset-bottom))] min-h-0 overflow-hidden md:bottom-0">
          {APP_MODULES.map((item) => {
            const active = item.id === activeModuleId;
            const ModuleComponent = item.component;
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
      </main>

      <MobileTabBar modules={APP_MODULES} activeId={activeModuleId} onSelect={setActiveModuleId} />
    </div>
  );
}
