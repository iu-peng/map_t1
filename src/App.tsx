import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { APP_MODULES, type AppModuleId } from '@/modules/registry';

export default function App() {
  const [activeModuleId, setActiveModuleId] = useState<AppModuleId>('navigation');
  const activeModule = useMemo(
    () => APP_MODULES.find((item) => item.id === activeModuleId) || APP_MODULES[0],
    [activeModuleId],
  );
  const ActiveModule = activeModule.component;

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-slate-950 text-slate-950">
      <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950 p-4 text-white md:flex md:flex-col">
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20">
          <div className="text-xs font-medium uppercase tracking-[0.28em] text-blue-200/70">Gaode Map</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">个人地图工作台</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">模块化管理导航、地点、收藏与偏好设置。</p>
        </div>

        <nav className="space-y-2">
          {APP_MODULES.map((item) => {
            const active = item.id === activeModuleId;
            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                className={cn(
                  'h-auto w-full justify-start gap-3 rounded-2xl px-3 py-3 text-left text-slate-300 hover:bg-white/10 hover:text-white',
                  active && 'bg-white text-slate-950 shadow-lg hover:bg-white hover:text-slate-950',
                )}
                onClick={() => setActiveModuleId(item.id)}
              >
                <span className={cn('grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-base', active && 'bg-blue-600 text-white')}>
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={cn('mt-0.5 block truncate text-xs text-slate-400', active && 'text-slate-500')}>{item.description}</span>
                </span>
              </Button>
            );
          })}
        </nav>
      </aside>

      <main className="relative min-w-0 flex-1 overflow-hidden bg-slate-100">
        <div className="absolute inset-x-0 top-0 bottom-[calc(74px+env(safe-area-inset-bottom))] min-h-0 overflow-hidden md:bottom-0">
          <ActiveModule />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-[2147482000] border-t bg-white/95 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.14)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {APP_MODULES.map((item) => {
            const active = item.id === activeModuleId;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'flex h-14 flex-col items-center justify-center rounded-2xl text-xs font-medium text-slate-500 transition-colors',
                  active && 'bg-blue-600 text-white shadow-lg shadow-blue-600/20',
                )}
                onClick={() => setActiveModuleId(item.id)}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
