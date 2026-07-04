import { PanelLeftClose } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AppModule } from '../modules';

type SidebarProps = {
  modules: AppModule[];
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

/** 桌面端左侧导航栏（可收起），基于路由高亮当前模块。 */
export function Sidebar({ modules, collapsed, onCollapsedChange }: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden shrink-0 border-r border-white/10 bg-slate-950 text-white transition-[width,padding] duration-300 ease-in-out md:flex md:flex-col',
        collapsed ? 'w-14 p-0' : 'w-72 p-4',
      )}
    >
      <div
        className={cn(
          'mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 transition-all duration-300 ease-in-out',
          collapsed && 'mb-0 max-h-0 border-transparent p-0 opacity-0',
        )}
      >
        <div className="text-xs font-medium uppercase tracking-[0.28em] text-blue-200/70">Gaode Map</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">个人地图工作台</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">模块化管理导航、地点、收藏与偏好设置。</p>
      </div>

      <nav className={cn('space-y-2 transition-all duration-300', collapsed && 'space-y-0 pt-4')}>
        {modules.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              title={item.label}
              className={({ isActive }) =>
                cn(
                  'group flex h-auto w-full items-center text-left text-slate-400 transition-all duration-300 hover:text-slate-300',
                  collapsed ? 'h-14 justify-center px-0 py-0' : 'justify-start gap-3 rounded-2xl px-3 py-3',
                  isActive && 'text-blue-400 hover:text-blue-300',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-slate-400 transition-colors duration-200 group-hover:bg-blue-500/15 group-hover:text-blue-300',
                      isActive && 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/25 group-hover:text-blue-300',
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isActive && 'stroke-[2.7]')} aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 overflow-hidden transition-all duration-300',
                      collapsed ? 'w-0 flex-none opacity-0' : 'w-auto opacity-100',
                    )}
                  >
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className={cn('mt-0.5 block truncate text-xs text-slate-500', isActive && 'text-blue-300/80')}>
                      {item.description}
                    </span>
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {collapsed ? (
        <button
          type="button"
          className="mt-auto h-full min-h-16 w-full cursor-e-resize border-0 bg-transparent p-0"
          onClick={() => onCollapsedChange(false)}
          aria-label="展开侧边栏"
          title="点击展开侧边栏"
        />
      ) : (
        <div className="mt-auto flex justify-center border-t border-white/10 pt-4 transition-all duration-300">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-2xl text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => onCollapsedChange(true)}
            aria-label="收起侧边栏"
            title="收起"
          >
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </div>
      )}
    </aside>
  );
}
