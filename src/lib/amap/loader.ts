import AMapLoader from '@amap/amap-jsapi-loader';
import type { AMapNamespace, LngLat, RouteEffect, TravelMode } from './types';

const AMAP_PLUGINS = [
  'AMap.Scale',
  'AMap.ToolBar',
  'AMap.AutoComplete',
  'AMap.PlaceSearch',
  'AMap.Geocoder',
  'AMap.Driving',
  'AMap.Riding',
  'AMap.Walking',
  'AMap.Transfer',
];

/** 地图缩放层级范围 [最小, 最大] */
const DEFAULT_ZOOMS: LngLat = [3.6, 20];

let amapPromise: Promise<AMapNamespace> | null = null;

/**
 * 为 AMap.Map 注入默认 zooms，避免每个调用方重复传参。
 * 通过包装构造函数实现，只打补丁一次。
 */
function patchAMapMap(AMap: AMapNamespace): AMapNamespace {
  if (!AMap?.Map || AMap.__gaodeMapPatched) return AMap;

  const OriginalMap = AMap.Map;

  function PatchedMap(this: unknown, container: HTMLElement | string, options: Record<string, unknown> = {}) {
    return new OriginalMap(container, {
      ...options,
      zooms: options.zooms || DEFAULT_ZOOMS,
    });
  }

  PatchedMap.prototype = OriginalMap.prototype;
  Object.assign(PatchedMap, OriginalMap);
  AMap.Map = PatchedMap;
  AMap.__gaodeMapPatched = true;

  return AMap;
}

/** 加载高德 JSAPI（带缓存，全局仅加载一次）。 */
export function loadAMap(): Promise<AMapNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('高德地图 JSAPI 只能在浏览器环境加载'));
  }

  if (amapPromise) return amapPromise;

  const { VITE_AMAP_JS_API_KEY: key, VITE_AMAP_SECURITY_JS_CODE: securityJsCode, VITE_AMAP_SERVICE_HOST: serviceHost } =
    import.meta.env;

  if (!key) {
    return Promise.reject(new Error('缺少 VITE_AMAP_JS_API_KEY，请先在环境变量中配置高德 Web端(JS API) Key'));
  }

  if (serviceHost) {
    window._AMapSecurityConfig = { serviceHost };
  } else if (securityJsCode) {
    window._AMapSecurityConfig = { securityJsCode };
  }

  amapPromise = AMapLoader.load({ key, version: '2.0', plugins: AMAP_PLUGINS }).then(patchAMapMap);

  return amapPromise;
}

/** 根据出行方式创建对应的高德路线规划器。 */
export function createRoutePlanner(
  AMap: AMapNamespace,
  mode: TravelMode,
  map: AMapNamespace,
  panel: HTMLElement,
  options: { city: string; routeEffect: RouteEffect },
): AMapNamespace {
  if (mode === 'transit') {
    return new AMap.Transfer({
      map,
      panel,
      hideMarkers: true,
      autoFitView: true,
      city: options.city === '全国' ? '' : options.city,
      policy: AMap.TransferPolicy?.LEAST_TIME,
    });
  }

  const commonOptions = { panel, hideMarkers: true, autoFitView: false };

  if (mode === 'driving') {
    return new AMap.Driving({
      ...commonOptions,
      policy: AMap.DrivingPolicy.LEAST_TIME,
      showTraffic: options.routeEffect === 'traffic',
      isOutline: false,
    });
  }

  if (mode === 'riding') {
    return new AMap.Riding(commonOptions);
  }

  return new AMap.Walking(commonOptions);
}
