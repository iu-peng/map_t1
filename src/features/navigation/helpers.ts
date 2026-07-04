import { parseLngLat } from '@/lib/amap';
import type { AddressSuggestion, Endpoint, PoiPoint } from './types';

/** 起终点标签：优先「名称（地址）」。 */
export function getPoiLabel(poi?: PoiPoint | null): string {
  if (!poi) return '';
  return poi.address ? `${poi.name}（${poi.address}）` : poi.name;
}

/** 候选项副标题文案。 */
export function getSuggestionText(item: AddressSuggestion): string {
  return [item.district, item.address].filter(Boolean).join(' · ') || '点击选择此地点';
}

const ENDPOINT_LABEL: Record<Endpoint, string> = { start: '起点', end: '终点' };

export function endpointLabel(endpoint: Endpoint): string {
  return ENDPOINT_LABEL[endpoint];
}

/**
 * 将输入框内容解析为可用于规划的地点：
 * 支持 `lng,lat` 坐标；否则要求已从联想结果中选中过。
 */
export function resolveRoutePoi(endpoint: Endpoint, keyword: string, poi: PoiPoint | null): PoiPoint {
  const trimmed = keyword.trim();
  const lnglat = parseLngLat(trimmed);
  if (lnglat) return { name: trimmed, lnglat };

  if (poi && poi.name === trimmed) return poi;

  throw new Error(`请先从${ENDPOINT_LABEL[endpoint]}地址提示中选择一个具体地点`);
}
