import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoutePlanner, formatDistance, formatDuration, loadAMap } from '../../utils/amapLoader';
import type { RouteEffect, TravelMode } from '../../utils/amapLoader';
import './AmapNavigationPage.css';

type PoiPoint = {
  name: string;
  address?: string;
  lnglat: [number, number];
};

type AddressSuggestion = {
  id?: string;
  name: string;
  district?: string;
  address?: string;
  lnglat?: [number, number];
};

type RouteSummary = {
  distance?: number;
  time?: number;
};

type MarkerStyle = 'default' | 'label' | 'badge';

type StyleConfig = {
  mapStyle: string;
  routeEffect: RouteEffect;
  markerStyle: MarkerStyle;
};

const MODE_OPTIONS: Array<{ label: string; value: TravelMode }> = [
  { label: '驾车', value: 'driving' },
  { label: '公交', value: 'transit' },
  { label: '骑行', value: 'riding' },
  { label: '步行', value: 'walking' },
];

const MAP_STYLE_OPTIONS = [
  { label: '标准', desc: '信息完整，接近高德默认', value: 'amap://styles/normal', preview: 'normal' },
  { label: '清新', desc: '浅色、干净，适合 H5', value: 'amap://styles/fresh', preview: 'fresh' },
  { label: '灰白', desc: '商务低干扰风格', value: 'amap://styles/whitesmoke', preview: 'smoke' },
  { label: '夜晚', desc: '默认深色夜晚风格', value: 'amap://styles/dark', preview: 'dark' },
  { label: '马卡龙', desc: '柔和年轻化', value: 'amap://styles/macaron', preview: 'macaron' },
  { label: '蓝色', desc: '偏导航产品感', value: 'amap://styles/blue', preview: 'blue' },
];

const ROUTE_EFFECT_OPTIONS: Array<{ label: string; desc: string; value: RouteEffect }> = [
  { label: '默认路线', desc: '使用矢量路线，缩放时跟随地图变化', value: 'default' },
  { label: '实时路况', desc: '驾车模式预留路况配置，路线仍保持矢量跟随', value: 'traffic' },
  { label: '简洁路线', desc: '减少轮廓效果，路线更清爽', value: 'simple' },
];

const MARKER_STYLE_OPTIONS: Array<{ label: string; desc: string; value: MarkerStyle }> = [
  { label: '默认图标', desc: '高德默认 Marker，最原生', value: 'default' },
  { label: '文字标签', desc: '默认图标 + 起点/终点文字', value: 'label' },
  { label: '彩色徽标', desc: '绿色起点、红色终点，更醒目', value: 'badge' },
];

const DEFAULT_STYLE_CONFIG: StyleConfig = {
  mapStyle: 'amap://styles/dark',
  routeEffect: 'default',
  markerStyle: 'label',
};

const FALLBACK_CENTER: [number, number] = [116.397428, 39.90923];

function normalizeCity(value?: string) {
  return value?.trim() || '全国';
}

function parseLngLat(value: string): [number, number] | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const lng = Number(match[1]);
  const lat = Number(match[2]);
  if (Number.isNaN(lng) || Number.isNaN(lat)) return null;
  return [lng, lat];
}

function normalizeAddress(value: unknown) {
  if (Array.isArray(value)) return value.join('');
  return typeof value === 'string' ? value : '';
}

function toLngLat(location: any): [number, number] | undefined {
  if (!location) return undefined;

  if (Array.isArray(location)) {
    const lng = Number(location[0]);
    const lat = Number(location[1]);
    return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : undefined;
  }

  if (typeof location === 'string') {
    return parseLngLat(location) || undefined;
  }

  const lng = Number(typeof location.getLng === 'function' ? location.getLng() : location.lng);
  const lat = Number(typeof location.getLat === 'function' ? location.getLat() : location.lat);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : undefined;
}

function toAmapLngLat(AMap: any, lnglat: [number, number]) {
  return new AMap.LngLat(lnglat[0], lnglat[1]);
}

function normalizeSuggestion(tip: any): AddressSuggestion | null {
  if (!tip?.name || tip.name === '请输入关键字') return null;

  const lnglat = toLngLat(tip.location);
  const district = normalizeAddress(tip.district);
  const address = normalizeAddress(tip.address);

  return {
    id: tip.id,
    name: tip.name,
    district,
    address,
    lnglat,
  };
}

function getPoiLabel(poi?: PoiPoint | null) {
  if (!poi) return '';
  return poi.address ? `${poi.name}（${poi.address}）` : poi.name;
}

function getSuggestionText(item: AddressSuggestion) {
  return [item.district, item.address].filter(Boolean).join(' · ') || '点击选择此地点';
}

function createBadgeMarkerContent(type: 'start' | 'end') {
  return `<div class="amap-route-badge-marker ${type === 'start' ? 'is-start' : 'is-end'}"><span>${type === 'start' ? '起' : '终'}</span></div>`;
}

function getFirstRoute(result: any) {
  return result?.routes?.[0] || result?.plans?.[0] || result?.route || null;
}

function getRouteSegments(route: any) {
  const candidates = [route?.steps, route?.rides, route?.walks, route?.paths];
  return candidates.find(Array.isArray) || [];
}

function getRoutePath(route: any): [number, number][] {
  const directPath = Array.isArray(route?.path) ? route.path : [];
  if (directPath.length > 0) return directPath.map(toLngLat).filter(Boolean) as [number, number][];

  return getRouteSegments(route)
    .flatMap((step: any) => (Array.isArray(step?.path) ? step.path : []))
    .map(toLngLat)
    .filter(Boolean) as [number, number][];
}

function getRouteColor(mode: TravelMode, routeEffect: RouteEffect) {
  if (routeEffect === 'traffic' && mode === 'driving') return '#22c55e';
  if (mode === 'walking') return '#f97316';
  if (mode === 'riding') return '#10b981';
  return '#3b82f6';
}

export default function AmapNavigationPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const routePanelRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const amapRef = useRef<any>(null);
  const plannerRef = useRef<any>(null);
  const placeSearchRef = useRef<any>(null);
  const autoCompleteRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const routeOverlayRefs = useRef<any[]>([]);
  const suggestionRequestRef = useRef({ start: 0, end: 0 });

  const [mode, setMode] = useState<TravelMode>('driving');
  const [startKeyword, setStartKeyword] = useState('');
  const [endKeyword, setEndKeyword] = useState('');
  const [startPoi, setStartPoi] = useState<PoiPoint | null>(null);
  const [endPoi, setEndPoi] = useState<PoiPoint | null>(null);
  const [startSuggestions, setStartSuggestions] = useState<AddressSuggestion[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('请输入起点和终点后开始路线规划');
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [styleConfig, setStyleConfig] = useState<StyleConfig>(DEFAULT_STYLE_CONFIG);
  const [draftConfig, setDraftConfig] = useState<StyleConfig>(DEFAULT_STYLE_CONFIG);

  const defaultCity = useMemo(() => normalizeCity(import.meta.env.VITE_AMAP_DEFAULT_CITY), []);
  const startPlaceholder = defaultCity === '全国' ? '请输入起点，如 北京南站' : `请输入起点，如 ${defaultCity}站`;
  const endPlaceholder = defaultCity === '全国' ? '请输入终点，如 天安门' : `请输入终点，如 ${defaultCity}市政府`;

  const clearRouteOverlays = useCallback(() => {
    const map = mapRef.current;
    if (map && routeOverlayRefs.current.length > 0) {
      routeOverlayRefs.current.forEach((overlay) => map.remove(overlay));
    }
    routeOverlayRefs.current = [];
  }, []);

  const clearSelectionMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (startMarkerRef.current) map.remove(startMarkerRef.current);
    if (endMarkerRef.current) map.remove(endMarkerRef.current);
    startMarkerRef.current = null;
    endMarkerRef.current = null;
  }, []);

  const resolveDefaultCityCenter = useCallback((AMap: any, city: string): Promise<[number, number]> => {
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
  }, []);

  const setMarker = useCallback((type: 'start' | 'end', poi: PoiPoint, markerStyle = styleConfig.markerStyle) => {
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return;

    const oldMarker = type === 'start' ? startMarkerRef.current : endMarkerRef.current;
    if (oldMarker) map.remove(oldMarker);

    const markerOptions: Record<string, any> = {
      position: poi.lnglat,
      title: poi.name,
      zIndex: type === 'start' ? 120 : 121,
    };

    if (markerStyle === 'label') {
      markerOptions.label = {
        content: type === 'start' ? '起点' : '终点',
        direction: 'top',
      };
    }

    if (markerStyle === 'badge') {
      markerOptions.content = createBadgeMarkerContent(type);
      markerOptions.offset = new AMap.Pixel(-17, -40);
    }

    const marker = new AMap.Marker(markerOptions);
    map.add(marker);

    if (type === 'start') startMarkerRef.current = marker;
    if (type === 'end') endMarkerRef.current = marker;
  }, [styleConfig.markerStyle]);

  const repaintMarkers = useCallback((nextConfig = styleConfig) => {
    clearSelectionMarkers();
    if (startPoi) setMarker('start', startPoi, nextConfig.markerStyle);
    if (endPoi) setMarker('end', endPoi, nextConfig.markerStyle);
  }, [clearSelectionMarkers, endPoi, setMarker, startPoi, styleConfig]);

  const renderVectorRoute = useCallback((route: any, start: PoiPoint, end: PoiPoint) => {
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return false;

    clearRouteOverlays();
    const path = getRoutePath(route);
    if (path.length < 2) return false;

    const overlays: any[] = [];

    if (styleConfig.routeEffect !== 'simple') {
      overlays.push(new AMap.Polyline({
        path,
        strokeColor: '#ffffff',
        strokeOpacity: styleConfig.mapStyle.includes('dark') ? 0.35 : 0.92,
        strokeWeight: 11,
        lineJoin: 'round',
        lineCap: 'round',
        zIndex: 58,
      }));
    }

    overlays.push(new AMap.Polyline({
      path,
      strokeColor: getRouteColor(mode, styleConfig.routeEffect),
      strokeOpacity: 0.96,
      strokeWeight: styleConfig.routeEffect === 'simple' ? 6 : 7,
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 59,
    }));

    routeOverlayRefs.current = overlays;
    map.add(overlays);

    const fitOverlays = [...overlays, startMarkerRef.current, endMarkerRef.current].filter(Boolean);
    map.setFitView(fitOverlays, false, [90, window.innerWidth > 1024 ? 430 : 96, 130, 90], 17);
    setMarker('start', start);
    setMarker('end', end);
    return true;
  }, [clearRouteOverlays, mode, setMarker, styleConfig.mapStyle, styleConfig.routeEffect]);

  const searchPoi = useCallback((keyword: string): Promise<PoiPoint> => {
    const placeSearch = placeSearchRef.current;
    if (!placeSearch) return Promise.reject(new Error('地图服务尚未初始化完成'));

    const lnglat = parseLngLat(keyword);
    if (lnglat) {
      return Promise.resolve({ name: keyword, lnglat });
    }

    return new Promise((resolve, reject) => {
      placeSearch.search(keyword.trim(), (status: string, result: any) => {
        const pois = result?.poiList?.pois || [];
        const first = pois[0];
        const firstLngLat = toLngLat(first?.location);

        if (status !== 'complete' || !firstLngLat) {
          reject(new Error(`没有找到地点：${keyword}`));
          return;
        }

        resolve({
          name: first.name,
          address: [normalizeAddress(first.pname), normalizeAddress(first.cityname), normalizeAddress(first.adname), normalizeAddress(first.address)]
            .filter(Boolean)
            .join(''),
          lnglat: firstLngLat,
        });
      });
    });
  }, []);

  const fetchSuggestions = useCallback((type: 'start' | 'end', keyword: string) => {
    const autoComplete = autoCompleteRef.current;
    const trimmed = keyword.trim();
    const setSuggestions = type === 'start' ? setStartSuggestions : setEndSuggestions;
    const currentRequest = ++suggestionRequestRef.current[type];

    if (!trimmed || parseLngLat(trimmed)) {
      setSuggestions([]);
      return;
    }

    if (!autoComplete) return;

    autoComplete.search(trimmed, (status: string, result: any) => {
      if (currentRequest !== suggestionRequestRef.current[type]) return;

      if (status !== 'complete') {
        setSuggestions([]);
        return;
      }

      const nextSuggestions = (result?.tips || [])
        .map(normalizeSuggestion)
        .filter(Boolean)
        .filter((item: AddressSuggestion) => item.name && (item.lnglat || item.district || item.address))
        .slice(0, 8);

      setSuggestions(nextSuggestions);
      if (nextSuggestions.length > 0) setMessage('请从下方候选地址中选择具体位置');
    });
  }, []);

  const selectSuggestion = useCallback(
    async (type: 'start' | 'end', item: AddressSuggestion) => {
      try {
        setMessage(`正在确认位置：${item.name}`);

        const poi: PoiPoint = item.lnglat
          ? {
              name: item.name,
              address: [item.district, item.address].filter(Boolean).join(''),
              lnglat: item.lnglat,
            }
          : await searchPoi([item.name, item.district].filter(Boolean).join(' '));

        if (type === 'start') {
          setStartPoi(poi);
          setStartKeyword(poi.name);
          setStartSuggestions([]);
        } else {
          setEndPoi(poi);
          setEndKeyword(poi.name);
          setEndSuggestions([]);
        }

        plannerRef.current?.clear?.();
        routePanelRef.current && (routePanelRef.current.innerHTML = '');
        clearRouteOverlays();
        setMarker(type, poi);
        setRouteSummary(null);
        mapRef.current?.setZoomAndCenter?.(15, poi.lnglat);
        setMessage(`已选择${type === 'start' ? '起点' : '终点'}：${getPoiLabel(poi)}`);
      } catch (error) {
        const err = error as Error;
        setMessage(err.message || '地点确认失败，请重新选择');
      }
    },
    [clearRouteOverlays, searchPoi, setMarker],
  );

  const resolveRoutePoi = useCallback((type: 'start' | 'end', keyword: string, poi: PoiPoint | null): PoiPoint => {
    const trimmed = keyword.trim();
    const lnglat = parseLngLat(trimmed);
    if (lnglat) return { name: trimmed, lnglat };

    if (poi && poi.name === trimmed) return poi;

    throw new Error(`请先从${type === 'start' ? '起点' : '终点'}地址提示中选择一个具体地点`);
  }, []);

  const createPlanner = useCallback(() => {
    const AMap = amapRef.current;
    const map = mapRef.current;
    const panel = routePanelRef.current;
    if (!AMap || !map || !panel) return null;

    plannerRef.current?.clear?.();
    panel.innerHTML = '';
    plannerRef.current = createRoutePlanner(AMap, mode, map, panel, {
      city: defaultCity,
      routeEffect: styleConfig.routeEffect,
    });
    return plannerRef.current;
  }, [defaultCity, mode, styleConfig.routeEffect]);

  const planRoute = useCallback(async () => {
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) {
      setMessage('地图仍在初始化，请稍后重试');
      return;
    }

    if (!startKeyword.trim() || !endKeyword.trim()) {
      setMessage('请先输入起点和终点');
      setMobileOpen(true);
      return;
    }

    try {
      setLoading(true);
      setMessage(mode === 'transit' ? '正在规划公交路线...' : '正在规划路线...');
      setRouteSummary(null);
      clearRouteOverlays();

      const nextStartPoi = resolveRoutePoi('start', startKeyword, startPoi);
      const nextEndPoi = resolveRoutePoi('end', endKeyword, endPoi);

      setStartPoi(nextStartPoi);
      setEndPoi(nextEndPoi);
      setStartKeyword(nextStartPoi.name);
      setEndKeyword(nextEndPoi.name);
      setStartSuggestions([]);
      setEndSuggestions([]);
      setMarker('start', nextStartPoi);
      setMarker('end', nextEndPoi);

      const planner = createPlanner();
      if (!planner) throw new Error('路线规划服务初始化失败');

      await new Promise<void>((resolve, reject) => {
        planner.search(
          toAmapLngLat(AMap, nextStartPoi.lnglat),
          toAmapLngLat(AMap, nextEndPoi.lnglat),
          (status: string, result: any) => {
            if (status !== 'complete') {
              reject(new Error(result?.info || '路线规划失败'));
              return;
            }

            const route = getFirstRoute(result);
            setRouteSummary({ distance: route?.distance, time: route?.time });

            if (mode !== 'transit') {
              const rendered = renderVectorRoute(route, nextStartPoi, nextEndPoi);
              if (!rendered) {
                reject(new Error('路线已返回，但未解析到可绘制路径'));
                return;
              }
            }

            setMessage(mode === 'transit' ? '公交路线规划完成' : '路线规划完成');
            resolve();
          },
        );
      });

      setMobileOpen(false);
    } catch (error) {
      const err = error as Error;
      setMessage(err.message || '路线规划失败');
      setMobileOpen(true);
    } finally {
      setLoading(false);
    }
  }, [clearRouteOverlays, createPlanner, endKeyword, endPoi, mode, renderVectorRoute, resolveRoutePoi, setMarker, startKeyword, startPoi]);

  const resetRoute = useCallback(() => {
    plannerRef.current?.clear?.();
    routePanelRef.current && (routePanelRef.current.innerHTML = '');
    clearRouteOverlays();
    setRouteSummary(null);
    setStartSuggestions([]);
    setEndSuggestions([]);
    setMessage(`已清除路线，当前默认城市：${defaultCity}`);
  }, [clearRouteOverlays, defaultCity]);

  const openConfig = useCallback(() => {
    setDraftConfig(styleConfig);
    setConfigOpen(true);
    setMobileOpen(true);
  }, [styleConfig]);

  const applyConfig = useCallback(() => {
    setStyleConfig(draftConfig);
    mapRef.current?.setMapStyle?.(draftConfig.mapStyle);
    repaintMarkers(draftConfig);
    plannerRef.current?.clear?.();
    routePanelRef.current && (routePanelRef.current.innerHTML = '');
    clearRouteOverlays();
    setRouteSummary(null);
    setConfigOpen(false);
    setMessage('样式配置已应用，请重新生成路线查看路线效果');
  }, [clearRouteOverlays, draftConfig, repaintMarkers]);

  useEffect(() => {
    let destroyed = false;

    async function initMap() {
      try {
        const AMap = await loadAMap();
        if (destroyed || !mapContainerRef.current) return;

        const cityCenter = await resolveDefaultCityCenter(AMap, defaultCity);
        if (destroyed || !mapContainerRef.current) return;

        amapRef.current = AMap;
        const map = new AMap.Map(mapContainerRef.current, {
          zoom: defaultCity === '全国' ? 5 : 12,
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
        map.addControl(new AMap.ToolBar({ position: { right: '24px', top: '24px' } }));

        if (defaultCity !== '全国') {
          map.setCity?.(defaultCity, () => {
            if (!destroyed) map.setZoom?.(12);
          });
        }

        placeSearchRef.current = new AMap.PlaceSearch({ city: defaultCity, citylimit: false });
        autoCompleteRef.current = new AMap.AutoComplete({ city: defaultCity, citylimit: false });

        mapRef.current = map;
        setMessage(`地图加载完成，当前默认城市：${defaultCity}，请输入起点和终点`);
      } catch (error) {
        const err = error as Error;
        setMessage(err.message || '地图加载失败，请检查高德 Key 配置');
      }
    }

    initMap();

    return () => {
      destroyed = true;
      plannerRef.current?.clear?.();
      clearRouteOverlays();
      clearSelectionMarkers();
      mapRef.current?.destroy?.();
      mapRef.current = null;
      autoCompleteRef.current = null;
      placeSearchRef.current = null;
    };
  }, [clearRouteOverlays, clearSelectionMarkers, defaultCity, resolveDefaultCityCenter]);

  useEffect(() => {
    if (startPoi && startPoi.name !== startKeyword) setStartPoi(null);
  }, [startKeyword, startPoi]);

  useEffect(() => {
    if (endPoi && endPoi.name !== endKeyword) setEndPoi(null);
  }, [endKeyword, endPoi]);

  useEffect(() => {
    const keyword = startKeyword.trim();
    if (!keyword || startPoi?.name === keyword) {
      setStartSuggestions([]);
      return;
    }

    const timer = window.setTimeout(() => fetchSuggestions('start', keyword), 250);
    return () => window.clearTimeout(timer);
  }, [fetchSuggestions, startKeyword, startPoi?.name]);

  useEffect(() => {
    const keyword = endKeyword.trim();
    if (!keyword || endPoi?.name === keyword) {
      setEndSuggestions([]);
      return;
    }

    const timer = window.setTimeout(() => fetchSuggestions('end', keyword), 250);
    return () => window.clearTimeout(timer);
  }, [endKeyword, endPoi?.name, fetchSuggestions]);

  const renderSuggestions = (type: 'start' | 'end', suggestions: AddressSuggestion[]) => {
    if (suggestions.length === 0) return null;

    return (
      <div className="amap-route-suggestions">
        {suggestions.map((item, index) => (
          <button
            key={`${item.id || item.name}-${index}`}
            type="button"
            className="amap-route-suggestion"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectSuggestion(type, item)}
          >
            <strong>{item.name}</strong>
            <span>{getSuggestionText(item)}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderConfigPanel = () => (
    <div className="amap-route-config">
      <div className="amap-route-config__header">
        <div>
          <h3>地图样式配置</h3>
          <p>选择后点击确认，立即应用到底图、路线和起终点。</p>
        </div>
        <button type="button" onClick={() => setConfigOpen(false)}>×</button>
      </div>

      <section>
        <h4>地图底图</h4>
        <div className="amap-config-grid">
          {MAP_STYLE_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`amap-config-card ${draftConfig.mapStyle === item.value ? 'is-active' : ''}`}
              onClick={() => setDraftConfig((prev) => ({ ...prev, mapStyle: item.value }))}
            >
              <i className={`amap-map-preview is-${item.preview}`} />
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h4>路线效果</h4>
        <div className="amap-config-list">
          {ROUTE_EFFECT_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={draftConfig.routeEffect === item.value ? 'is-active' : ''}
              onClick={() => setDraftConfig((prev) => ({ ...prev, routeEffect: item.value }))}
            >
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h4>起点终点</h4>
        <div className="amap-config-list">
          {MARKER_STYLE_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={draftConfig.markerStyle === item.value ? 'is-active' : ''}
              onClick={() => setDraftConfig((prev) => ({ ...prev, markerStyle: item.value }))}
            >
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="amap-route-config__actions">
        <button type="button" onClick={() => setDraftConfig(DEFAULT_STYLE_CONFIG)}>恢复默认</button>
        <button type="button" onClick={applyConfig}>确认应用</button>
      </div>
    </div>
  );

  const panel = (
    <div className="amap-route-card">
      {configOpen ? renderConfigPanel() : (
        <>
          <div className="amap-route-card__header">
            <div>
              <h2>路线导航</h2>
              <p>{message}</p>
            </div>
            <div className="amap-route-header-actions">
              <button type="button" onClick={openConfig}>配置</button>
              <button className="amap-route-card__close" type="button" onClick={() => setMobileOpen(false)} aria-label="关闭路线面板">×</button>
            </div>
          </div>

          <div className="amap-route-mode">
            {MODE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={item.value === mode ? 'is-active' : ''}
                onClick={() => {
                  setMode(item.value);
                  plannerRef.current?.clear?.();
                  routePanelRef.current && (routePanelRef.current.innerHTML = '');
                  clearRouteOverlays();
                  setRouteSummary(null);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="amap-route-field">
            <span>起点</span>
            <input
              value={startKeyword}
              placeholder={startPlaceholder}
              onChange={(event) => {
                setStartKeyword(event.target.value);
                setRouteSummary(null);
              }}
              onFocus={() => fetchSuggestions('start', startKeyword)}
              onKeyDown={(event) => event.key === 'Enter' && planRoute()}
            />
            {renderSuggestions('start', startSuggestions)}
          </div>

          <div className="amap-route-field">
            <span>终点</span>
            <input
              value={endKeyword}
              placeholder={endPlaceholder}
              onChange={(event) => {
                setEndKeyword(event.target.value);
                setRouteSummary(null);
              }}
              onFocus={() => fetchSuggestions('end', endKeyword)}
              onKeyDown={(event) => event.key === 'Enter' && planRoute()}
            />
            {renderSuggestions('end', endSuggestions)}
          </div>

          <div className="amap-route-selected">
            <div>起点：{getPoiLabel(startPoi) || '-'}</div>
            <div>终点：{getPoiLabel(endPoi) || '-'}</div>
          </div>

          <div className="amap-route-actions">
            <button type="button" onClick={planRoute} disabled={loading}>{loading ? '规划中...' : '开始规划'}</button>
            <button type="button" className="amap-route-actions__secondary" onClick={resetRoute}>清除路线</button>
          </div>

          {routeSummary && (
            <div className="amap-route-summary">
              <div>
                <strong>{formatDistance(routeSummary.distance)}</strong>
                <span>预计距离</span>
              </div>
              <div>
                <strong>{formatDuration(routeSummary.time)}</strong>
                <span>预计用时</span>
              </div>
            </div>
          )}

          <div className="amap-route-detail" ref={routePanelRef} />
        </>
      )}
    </div>
  );

  return (
    <div className="amap-route-page">
      <div className="amap-route-map" ref={mapContainerRef} />
      <div className={`amap-route-panel ${mobileOpen ? 'is-open' : ''}`}>{panel}</div>
      <button className="amap-route-mobile-trigger" type="button" onClick={() => setMobileOpen(true)} aria-label="打开路线面板">路线</button>
      <div className={`amap-route-mobile-mask ${mobileOpen ? 'is-open' : ''}`} onClick={() => setMobileOpen(false)} />
    </div>
  );
}
