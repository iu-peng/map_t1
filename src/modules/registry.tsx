import type { ComponentType } from 'react';
import { NavigationModule } from './navigation/NavigationModule';
import { RoutePlanModule } from './route-plan/RoutePlanModule';
import { PoiSearchModule } from './poi-search/PoiSearchModule';
import { FavoritesModule } from './favorites/FavoritesModule';
import { SettingsModule } from './settings/SettingsModule';

export type AppModuleId = 'navigation' | 'route-plan' | 'poi-search' | 'favorites' | 'settings';

export type AppModule = {
  id: AppModuleId;
  label: string;
  description: string;
  icon: string;
  component: ComponentType;
};

export const APP_MODULES: AppModule[] = [
  { id: 'navigation', label: '导航', description: '起终点路线规划与地图样式配置', icon: '◎', component: NavigationModule },
  { id: 'route-plan', label: '路线', description: '模块 2 占位', icon: '◇', component: RoutePlanModule },
  { id: 'poi-search', label: '地点', description: '模块 3 占位', icon: '⌕', component: PoiSearchModule },
  { id: 'favorites', label: '收藏', description: '模块 4 占位', icon: '☆', component: FavoritesModule },
  { id: 'settings', label: '配置', description: '模块 5 占位', icon: '⚙', component: SettingsModule },
];
