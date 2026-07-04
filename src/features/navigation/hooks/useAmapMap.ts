import { useEffect, useRef, useState, type RefObject } from 'react';
import { loadAMap, toLngLat, type AMapMap, type AMapNamespace, type LngLat } from '@/lib/amap';
import { DEFAULT_CITY_ZOOM, DEFAULT_COUNTRY_ZOOM, DEFAULT_STYLE_CONFIG, FALLBACK_CENTER } from '../constants';

type UseAmapMapOptions = {
  defaultCity: string;
  onMessage: (message: string) => void;
};

export type AmapMapController = {
  /** 地图容器 ref，挂到渲染地图的 div 上。 */
  containerRef: RefObject<HTMLDivElement>;
  /** 高德命名空间实例 ref。 */
  amapRef: RefObject<AMapNamespace | null>;
  /** 地图实例 ref。 */
  mapRef: RefObject<AMapMap | null>;
  /** PlaceSearch 服务 ref。 */
  placeSearchRef: RefObject<AMapNamespace | null>;
  /** AutoComplete 服务 ref。 */
  autoCompleteRef: RefObject<AMapNamespace | null>;
  /** 地图与服务是否初始化完成。 */
  ready: boolean;
};

/** 定位默认城市中心，失败时回退到北京。 */
function resolveDefaultCityCenter(AMap: AMapNamespace, city: string): Promise<LngLat> {
  if (!city || city === '全国') return Promise.resolve(FALLBACK_CENTER);

  return new Promise((resolve) => {
    try {
      const geocoder = new AMap.Geocoder({ city });
      geocoder.getLocation(city, (status: string, result: any) => {
        const center = toLngLat(result?.geocodes?.[0]?.location);
        resolve(status === 'complete' && center ? center : FALLBACK_CENTER);
      });
    } catch {
      resolve(FALLBACK_CENTER);
    }
  });
}

/**
 * 负责高德地图与检索服务的完整生命周期：加载 JSAPI、创建地图与控件、
 * 初始化 PlaceSearch / AutoComplete，并在卸载时释放资源。
 */
export function useAmapMap({ defaultCity, onMessage }: UseAmapMapOptions): AmapMapController {
  const containerRef = useRef<HTMLDivElement>(null);
  const amapRef = useRef<AMapNamespace | null>(null);
  const mapRef = useRef<AMapMap | null>(null);
  const placeSearchRef = useRef<AMapNamespace | null>(null);
  const autoCompleteRef = useRef<AMapNamespace | null>(null);
  const [ready, setReady] = useState(false);

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let destroyed = false;

    async function initMap() {
      try {
        const AMap = await loadAMap();
        if (destroyed || !containerRef.current) return;

        const cityCenter = await resolveDefaultCityCenter(AMap, defaultCity);
        if (destroyed || !containerRef.current) return;

        amapRef.current = AMap;
        const map = new AMap.Map(containerRef.current, {
          zoom: defaultCity === '全国' ? DEFAULT_COUNTRY_ZOOM : DEFAULT_CITY_ZOOM,
          center: cityCenter,
          viewMode: '2D',
          resizeEnable: true,
          mapStyle: DEFAULT_STYLE_CONFIG.mapStyle,
          zoomEnable: true,
          touchZoom: true,
          dragEnable: true,
          doubleClickZoom: true,
        });

        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({ position: { right: '16px', bottom: '96px' } }));

        if (defaultCity !== '全国') {
          map.setCity?.(defaultCity, () => {
            if (!destroyed) map.setZoom?.(DEFAULT_CITY_ZOOM);
          });
        }

        placeSearchRef.current = new AMap.PlaceSearch({ city: defaultCity, citylimit: false });
        autoCompleteRef.current = new AMap.AutoComplete({ city: defaultCity, citylimit: false });

        mapRef.current = map;
        setReady(true);
        onMessageRef.current(`地图加载完成，当前默认城市：${defaultCity}，请输入起点和终点`);
      } catch (error) {
        const err = error as Error;
        onMessageRef.current(err.message || '地图加载失败，请检查高德 Key 配置');
      }
    }

    initMap();

    return () => {
      destroyed = true;
      mapRef.current?.destroy?.();
      mapRef.current = null;
      autoCompleteRef.current = null;
      placeSearchRef.current = null;
      setReady(false);
    };
  }, [defaultCity]);

  return { containerRef, amapRef, mapRef, placeSearchRef, autoCompleteRef, ready };
}
