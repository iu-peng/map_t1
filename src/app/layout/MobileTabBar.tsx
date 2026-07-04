import { cn } from '@/lib/utils';
import type { AppModule, AppModuleId } from '../modules';

type MobileTabBarProps = {
  modules: AppModule[];
  activeId: AppModuleId;
  onSelect: (id: AppModuleId) => void;
};

/** 移动端底部标签栏。 */
export function MobileTabBar({ modules, activeId, onSelect }: MobileTabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.14)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {modules.map((item) => {
          const active = item.id === activeId;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                'flex h-14 flex-col items-center justify-center rounded-2xl text-xs font-medium text-slate-500 transition-colors',
                active ? 'text-blue-600' : 'hover:text-slate-900',
              )}
              onClick={() => onSelect(item.id)}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.6]')} aria-hidden="true" />
              <span className="mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
