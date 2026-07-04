import type { AMapNamespace, LngLat } from './types';

/** 空城市归一化为「全国」。 */
export function normalizeCity(value?: string): string {
  return value?.trim() || '全国';
}

/** 解析 `lng,lat` 文本坐标，非法返回 null。 */
export function parseLngLat(value: string): LngLat | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const lng = Number(match[1]);
  const lat = Number(match[2]);
  if (Number.isNaN(lng) || Number.isNaN(lat)) return null;
  return [lng, lat];
}

/** 高德返回的地址字段可能是数组，统一拼成字符串。 */
export function normalizeAddress(value: unknown): string {
  if (Array.isArray(value)) return value.join('');
  return typeof value === 'string' ? value : '';
}

/** 将高德多种位置表示（数组 / 字符串 / LngLat 对象）统一为 [lng, lat]。 */
export function toLngLat(location: unknown): LngLat | undefined {
  if (!location) return undefined;

  if (Array.isArray(location)) {
    const lng = Number(location[0]);
    const lat = Number(location[1]);
    return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : undefined;
  }

  if (typeof location === 'string') {
    return parseLngLat(location) || undefined;
  }

  const loc = location as { getLng?: () => number; getLat?: () => number; lng?: number; lat?: number };
  const lng = Number(typeof loc.getLng === 'function' ? loc.getLng() : loc.lng);
  const lat = Number(typeof loc.getLat === 'function' ? loc.getLat() : loc.lat);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : undefined;
}

/** 构造高德 LngLat 实例。 */
export function toAmapLngLat(AMap: AMapNamespace, lnglat: LngLat): AMapNamespace {
  return new AMap.LngLat(lnglat[0], lnglat[1]);
}
