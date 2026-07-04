import { useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { KeepAliveModules } from '@/app/KeepAliveModules';
import { MobileTabBar } from '@/app/layout/MobileTabBar';
import { Sidebar } from '@/app/layout/Sidebar';
import { APP_MODULES, DEFAULT_MODULE_PATH } from '@/app/modules';

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-slate-950">
      <Sidebar modules={APP_MODULES} collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />

      <main className="relative min-w-0 flex-1 overflow-hidden bg-slate-100">
        {/* 内容由 KeepAliveModules 按路由缓存渲染 */}
        <KeepAliveModules modules={APP_MODULES} />
      </main>

      <MobileTabBar modules={APP_MODULES} />

      {/* 路由仅用于同步 URL 与兜底重定向，实际视图交给 KeepAliveModules 缓存渲染。 */}
      <Routes>
        <Route path="/" element={<Navigate to={DEFAULT_MODULE_PATH} replace />} />
        {APP_MODULES.map((item) => (
          <Route key={item.id} path={item.path} element={null} />
        ))}
        <Route path="*" element={<Navigate to={DEFAULT_MODULE_PATH} replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}
