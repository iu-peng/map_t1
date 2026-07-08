import type { ComponentType, SVGProps } from 'react';
import { Compass, Search, SlidersHorizontal, Star, Wallet } from 'lucide-react';
import { NavigationModule } from '@/features/navigation/NavigationModule';
import { PlaceholderModule } from '@/features/placeholders/PlaceholderModule';
import { WalletModule } from '@/features/wallet/WalletModule';

export type AppModuleId = 'navigation' | 'wallet' | 'poi-search' | 'favorites' | 'settings';

export type AppModule = {
  id: AppModuleId;
  /** 路由路径。 */
  path: string;
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  component: ComponentType;
};

/** 默认路由（首页）。 */
export const DEFAULT_MODULE_PATH = '/navigation';

export const APP_MODULES: AppModule[] = [
  {
    id: 'navigation',
    path: '/navigation',
    label: '导航',
    description: '起终点路线规划与地图样式配置',
    icon: Compass,
    component: NavigationModule,
  },
  {
    id: 'wallet',
    path: '/wallet',
    label: '钱包',
    description: '只读链上数据、地址余额与钱包环境检测',
    icon: Wallet,
    component: WalletModule,
  },
  {
    id: 'poi-search',
    path: '/poi-search',
    label: '地点',
    description: '模块 3 占位',
    icon: Search,
    component: () => (
      <PlaceholderModule title="地点搜索" description="模块 3 占位，后续可接入 POI 搜索、附近服务、分类筛选。" badge="模块 3" />
    ),
  },
  {
    id: 'favorites',
    path: '/favorites',
    label: '收藏',
    description: '模块 4 占位',
    icon: Star,
    component: () => (
      <PlaceholderModule title="收藏地点" description="模块 4 占位，后续可保存常用地址、路线和地图样式配置。" badge="模块 4" />
    ),
  },
  {
    id: 'settings',
    path: '/settings',
    label: '配置',
    description: '模块 5 占位',
    icon: SlidersHorizontal,
    component: () => (
      <PlaceholderModule title="应用设置" description="模块 5 占位，后续可管理默认城市、主题、样式和偏好。" badge="模块 5" />
    ),
  },
];
