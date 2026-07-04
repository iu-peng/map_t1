import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { AppModule } from '../modules';

type MobileTabBarProps = {
  modules: AppModule[];
};

/** 移动端底部标签栏，基于路由高亮当前模块。 */
export function MobileTabBar({ modules }: MobileTabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.14)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {modules.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex h-14 flex-col items-center justify-center rounded-2xl text-xs font-medium transition-colors',
                  isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.6]')} aria-hidden="true" />
                  <span className="mt-1">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
