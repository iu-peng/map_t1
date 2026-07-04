import type { LngLat } from '@/lib/amap';
import type { MarkerStyle, RouteColor, RouteEffect, StyleConfig, TravelMode } from './types';

export const MODE_OPTIONS: Array<{ label: string; value: TravelMode }> = [
  { label: '驾车', value: 'driving' },
  { label: '公交', value: 'transit' },
  { label: '骑行', value: 'riding' },
  { label: '步行', value: 'walking' },
];

export const MAP_STYLE_OPTIONS: Array<{ label: string; value: string; preview: string }> = [
  { label: '标准', value: 'amap://styles/normal', preview: 'normal' },
  { label: '清新', value: 'amap://styles/fresh', preview: 'fresh' },
  { label: '灰白', value: 'amap://styles/whitesmoke', preview: 'smoke' },
  { label: '深蓝', value: 'amap://styles/darkblue', preview: 'darkblue' },
  { label: '夜晚', value: 'amap://styles/dark', preview: 'dark' },
  { label: '蓝色', value: 'amap://styles/blue', preview: 'blue' },
];

export const ROUTE_EFFECT_OPTIONS: Array<{ label: string; value: RouteEffect; preview: string }> = [
  { label: '描边', value: 'default', preview: 'outline' },
  { label: '高亮', value: 'traffic', preview: 'highlight' },
  { label: '简洁', value: 'simple', preview: 'simple' },
];

export const ROUTE_COLOR_OPTIONS: Array<{ label: string; value: RouteColor; color: string }> = [
  { label: '蓝色', value: 'blue', color: '#3b82f6' },
  { label: '青色', value: 'cyan', color: '#06b6d4' },
  { label: '绿色', value: 'green', color: '#10b981' },
  { label: '橙色', value: 'orange', color: '#f97316' },
  { label: '紫色', value: 'purple', color: '#8b5cf6' },
  { label: '玫红', value: 'rose', color: '#f43f5e' },
];

export const MARKER_STYLE_OPTIONS: Array<{ label: string; value: MarkerStyle; preview: string }> = [
  { label: '默认', value: 'default', preview: 'default' },
  { label: '标签', value: 'label', preview: 'label' },
  { label: '徽标', value: 'badge', preview: 'badge' },
];

export const DEFAULT_STYLE_CONFIG: StyleConfig = {
  mapStyle: 'amap://styles/darkblue',
  routeEffect: 'default',
  routeColor: 'blue',
  markerStyle: 'label',
};

export const FALLBACK_CENTER: LngLat = [116.397428, 39.90923];
export const DEFAULT_COUNTRY_ZOOM = 5.5;
export const DEFAULT_CITY_ZOOM = 13;

/** 根据配置取路线颜色，未命中回退到蓝色。 */
export function resolveRouteColor(routeColor: RouteColor): string {
  return ROUTE_COLOR_OPTIONS.find((item) => item.value === routeColor)?.color || '#3b82f6';
}
