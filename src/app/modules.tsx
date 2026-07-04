import type { ComponentType, SVGProps } from 'react';
import { Compass, MapPinned, Search, SlidersHorizontal, Star } from 'lucide-react';
import { NavigationModule } from '@/features/navigation/NavigationModule';
import { PlaceholderModule } from '@/features/placeholders/PlaceholderModule';

export type AppModuleId = 'navigation' | 'route-plan' | 'poi-search' | 'favorites' | 'settings';

export type AppModule = {
  id: AppModuleId;
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  component: ComponentType;
};

export const APP_MODULES: AppModule[] = [
  {
    id: 'navigation',
    label: '导航',
    description: '起终点路线规划与地图样式配置',
    icon: Compass,
    component: NavigationModule,
  },
  {
    id: 'route-plan',
    label: '路线',
    description: '模块 2 占位',
    icon: MapPinned,
    component: () => (
      <PlaceholderModule title="路线规划" description="模块 2 占位，后续可接入多点路线、收藏路线、路线对比等能力。" badge="模块 2" />
    ),
  },
  {
    id: 'poi-search',
    label: '地点',
    description: '模块 3 占位',
    icon: Search,
    component: () => (
      <PlaceholderModule title="地点搜索" description="模块 3 占位，后续可接入 POI 搜索、附近服务、分类筛选。" badge="模块 3" />
    ),
  },
  {
    id: 'favorites',
    label: '收藏',
    description: '模块 4 占位',
    icon: Star,
    component: () => (
      <PlaceholderModule title="收藏地点" description="模块 4 占位，后续可保存常用地址、路线和地图样式配置。" badge="模块 4" />
    ),
  },
  {
    id: 'settings',
    label: '配置',
    description: '模块 5 占位',
    icon: SlidersHorizontal,
    component: () => (
      <PlaceholderModule title="应用设置" description="模块 5 占位，后续可管理默认城市、主题、样式和偏好。" badge="模块 5" />
    ),
  },
];
