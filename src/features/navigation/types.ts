import type { LngLat, RouteEffect, TravelMode } from '@/lib/amap';

/** 已确认的地点（起点 / 终点）。 */
export type PoiPoint = {
  name: string;
  address?: string;
  lnglat: LngLat;
};

/** 输入联想的候选地址。 */
export type AddressSuggestion = {
  id?: string;
  name: string;
  district?: string;
  address?: string;
  lnglat?: LngLat;
};

/** 路线概要（距离 / 时间）。 */
export type RouteSummary = {
  distance?: number;
  time?: number;
};

export type MarkerStyle = 'default' | 'label' | 'badge';
export type RouteColor = 'blue' | 'cyan' | 'green' | 'orange' | 'purple' | 'rose';

/** 地图与路线的样式配置。 */
export type StyleConfig = {
  mapStyle: string;
  routeEffect: RouteEffect;
  routeColor: RouteColor;
  markerStyle: MarkerStyle;
};

/** 起点 / 终点端点标识。 */
export type Endpoint = 'start' | 'end';

export type { TravelMode, RouteEffect };
