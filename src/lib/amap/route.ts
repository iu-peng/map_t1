import { toLngLat } from './geo';
import type { LngLat } from './types';

/** 从不同出行方式的规划结果里取出第一条路线。 */
export function getFirstRoute(result: any): any {
  return result?.routes?.[0] || result?.plans?.[0] || result?.route || null;
}

/** 路线的分段字段在不同出行方式下命名不同，这里统一取出。 */
function getRouteSegments(route: any): any[] {
  const candidates = [route?.steps, route?.rides, route?.walks, route?.paths];
  return candidates.find(Array.isArray) || [];
}

/** 提取路线的完整坐标点序列，用于绘制 Polyline。 */
export function getRoutePath(route: any): LngLat[] {
  const directPath = Array.isArray(route?.path) ? route.path : [];
  if (directPath.length > 0) {
    return directPath.map(toLngLat).filter(Boolean) as LngLat[];
  }

  return getRouteSegments(route)
    .flatMap((step: any) => (Array.isArray(step?.path) ? step.path : []))
    .map(toLngLat)
    .filter(Boolean) as LngLat[];
}

/** 深色底图（dark / blue 系）需要降低白色描边不透明度。 */
export function isDarkStyle(mapStyle: string): boolean {
  return mapStyle.includes('dark') || mapStyle.includes('blue');
}
