import AMapLoader from '@amap/amap-jsapi-loader';

export type TravelMode = 'driving' | 'riding' | 'walking' | 'transit';

export type RouteEffect = 'default' | 'traffic' | 'simple';

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

let amapPromise: Promise<any> | null = null;

export function loadAMap() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('高德地图 JSAPI 只能在浏览器环境加载'));
  }

  if (amapPromise) return amapPromise;

  const env = import.meta.env;
  const key = env.VITE_AMAP_JS_API_KEY;
  const securityJsCode = env.VITE_AMAP_SECURITY_JS_CODE;
  const serviceHost = env.VITE_AMAP_SERVICE_HOST;

  if (!key) {
    return Promise.reject(new Error('缺少 VITE_AMAP_JS_API_KEY，请先在环境变量中配置高德 Web端(JS API) Key'));
  }

  if (serviceHost) {
    window._AMapSecurityConfig = { serviceHost };
  } else if (securityJsCode) {
    window._AMapSecurityConfig = { securityJsCode };
  }

  amapPromise = AMapLoader.load({
    key,
    version: '2.0',
    plugins: AMAP_PLUGINS,
  });

  return amapPromise;
}

export function createRoutePlanner(
  AMap: any,
  mode: TravelMode,
  map: any,
  panel: HTMLElement,
  options: { city: string; routeEffect: RouteEffect },
) {
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

  const commonOptions = {
    panel,
    hideMarkers: true,
    autoFitView: false,
  };

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

export function formatDistance(meters?: number) {
  if (!meters && meters !== 0) return '-';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds?: number) {
  if (!seconds && seconds !== 0) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  if (h <= 0) return `${m} 分钟`;
  return `${h} 小时 ${m} 分钟`;
}
