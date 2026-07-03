import { useMemo, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { APP_MODULES, type AppModuleId } from '@/modules/registry';

export default function App() {
  const [activeModuleId, setActiveModuleId] = useState<AppModuleId>('navigation');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeModule = useMemo(
    () => APP_MODULES.find((item) => item.id === activeModuleId) || APP_MODULES[0],
    [activeModuleId],
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-slate-950 text-slate-950">
      <aside
        className={cn(
          'hidden shrink-0 border-r border-white/10 bg-slate-950 p-4 text-white transition-[width,padding] duration-300 ease-in-out md:flex md:flex-col',
          sidebarCollapsed ? 'w-[88px] px-3' : 'w-72',
        )}
      >
        <div
          className={cn(
            'mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 transition-all duration-300 ease-in-out',
            sidebarCollapsed && 'mb-3 max-h-0 border-transparent p-0 opacity-0',
          )}
        >
          <div className="text-xs font-medium uppercase tracking-[0.28em] text-blue-200/70">Gaode Map</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">个人地图工作台</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">模块化管理导航、地点、收藏与偏好设置。</p>
        </div>

        <nav className="space-y-2">
          {APP_MODULES.map((item) => {
            const active = item.id === activeModuleId;
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  'h-auto w-full rounded-2xl text-left text-slate-300 transition-all duration-300 hover:bg-white/10 hover:text-white',
                  sidebarCollapsed ? 'justify-center px-0 py-3' : 'justify-start gap-3 px-3 py-3',
                  active && 'bg-white text-slate-950 shadow-lg hover:bg-white hover:text-slate-950',
                )}
                onClick={() => setActiveModuleId(item.id)}
              >
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10', active && 'bg-blue-600 text-white')}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 overflow-hidden transition-all duration-300',
                    sidebarCollapsed ? 'w-0 flex-none opacity-0' : 'w-auto opacity-100',
                  )}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={cn('mt-0.5 block truncate text-xs text-slate-400', active && 'text-slate-500')}>{item.description}</span>
                </span>
              </Button>
            );
          })}
        </nav>

        <div className="mt-auto flex justify-center border-t border-white/10 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-2xl text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
            title={sidebarCollapsed ? '展开' : '收起'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
        </div>
      </aside>

      <main className="relative min-w-0 flex-1 overflow-hidden bg-slate-100">
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

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.14)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {APP_MODULES.map((item) => {
            const active = item.id === activeModuleId;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'flex h-14 flex-col items-center justify-center rounded-2xl text-xs font-medium text-slate-500 transition-colors',
                  active ? 'text-blue-600' : 'hover:text-slate-900',
                )}
                onClick={() => setActiveModuleId(item.id)}
              >
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.6]')} aria-hidden="true" />
                <span className="mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
