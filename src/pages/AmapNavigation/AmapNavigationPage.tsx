import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoutePlanner, formatDistance, formatDuration, loadAMap } from '../../utils/amapLoader';
import type { TravelMode } from '../../utils/amapLoader';
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

type RouteStep = {
  instruction: string;
  road?: string;
  distance?: number;
};

const MODE_OPTIONS: Array<{ label: string; value: TravelMode }> = [
  { label: '驾车', value: 'driving' },
  { label: '骑行', value: 'riding' },
  { label: '步行', value: 'walking' },
];

const FALLBACK_CENTER: [number, number] = [116.397428, 39.90923];
const MODERN_MAP_STYLE = 'amap://styles/fresh';

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

function stripHtml(value: unknown) {
  return normalizeAddress(value).replace(/<[^>]+>/g, '').trim();
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

function getRouteSteps(route: any): RouteStep[] {
  return getRouteSegments(route)
    .map((step: any) => ({
      instruction: stripHtml(step?.instruction || step?.action || step?.road || '继续前行'),
      road: stripHtml(step?.road),
      distance: Number(step?.distance),
    }))
    .filter((step: RouteStep) => step.instruction)
    .slice(0, 12);
}

function createMarkerContent(type: 'start' | 'end') {
  const isStart = type === 'start';
  return `
    <div class="amap-custom-marker ${isStart ? 'is-start' : 'is-end'}">
      <span class="amap-custom-marker__pin">${isStart ? '起' : '终'}</span>
      <span class="amap-custom-marker__pulse"></span>
    </div>
  `;
}

export default function AmapNavigationPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
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
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const setMarker = useCallback((type: 'start' | 'end', poi: PoiPoint) => {
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return;

    const oldMarker = type === 'start' ? startMarkerRef.current : endMarkerRef.current;
    if (oldMarker) map.remove(oldMarker);

    const marker = new AMap.Marker({
      position: poi.lnglat,
      title: poi.name,
      content: createMarkerContent(type),
      offset: new AMap.Pixel(-18, -48),
      zIndex: type === 'start' ? 120 : 121,
    });

    map.add(marker);

    if (type === 'start') startMarkerRef.current = marker;
    if (type === 'end') endMarkerRef.current = marker;
  }, []);

  const renderRoute = useCallback((route: any) => {
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return;

    clearRouteOverlays();
    const path = getRoutePath(route);
    if (path.length < 2) return;

    const glow = new AMap.Polyline({
      path,
      strokeColor: '#38bdf8',
      strokeOpacity: 0.22,
      strokeWeight: 18,
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 58,
    });

    const outline = new AMap.Polyline({
      path,
      strokeColor: '#ffffff',
      strokeOpacity: 0.96,
      strokeWeight: 12,
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 59,
    });

    const main = new AMap.Polyline({
      path,
      strokeColor: mode === 'walking' ? '#f97316' : mode === 'riding' ? '#10b981' : '#2563eb',
      strokeOpacity: 0.98,
      strokeWeight: 7,
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 60,
    });

    routeOverlayRefs.current = [glow, outline, main];
    map.add(routeOverlayRefs.current);

    const overlays = [glow, outline, main, startMarkerRef.current, endMarkerRef.current].filter(Boolean);
    map.setFitView(overlays, false, [96, window.innerWidth > 1024 ? 440 : 120, 120, 96], 17);
  }, [clearRouteOverlays, mode]);

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
      if (nextSuggestions.length > 0) {
        setMessage('请从下方候选地址中选择具体位置');
      }
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

        setMarker(type, poi);
        clearRouteOverlays();
        setRouteSummary(null);
        setRouteSteps([]);
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
    if (!AMap) return null;

    plannerRef.current?.clear?.();
    plannerRef.current = createRoutePlanner(AMap, mode);
    return plannerRef.current;
  }, [mode]);

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
      setMessage('正在规划路线...');
      setRouteSummary(null);
      setRouteSteps([]);
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
        planner.search(nextStartPoi.lnglat, nextEndPoi.lnglat, (status: string, result: any) => {
          if (status !== 'complete') {
            reject(new Error(result?.info || '路线规划失败'));
            return;
          }

          const route = result?.routes?.[0];
          setRouteSummary({ distance: route?.distance, time: route?.time });
          setRouteSteps(getRouteSteps(route));
          renderRoute(route);
          setMessage('路线规划完成');
          resolve();
        });
      });

      setMobileOpen(false);
    } catch (error) {
      const err = error as Error;
      setMessage(err.message || '路线规划失败');
      setMobileOpen(true);
    } finally {
      setLoading(false);
    }
  }, [clearRouteOverlays, createPlanner, endKeyword, endPoi, renderRoute, resolveRoutePoi, setMarker, startKeyword, startPoi]);

  const resetRoute = useCallback(() => {
    plannerRef.current?.clear?.();
    clearRouteOverlays();
    setRouteSummary(null);
    setRouteSteps([]);
    setStartSuggestions([]);
    setEndSuggestions([]);
    setMessage(`已清除路线，当前默认城市：${defaultCity}`);
  }, [clearRouteOverlays, defaultCity]);

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
          mapStyle: MODERN_MAP_STYLE,
          showLabel: true,
          features: ['bg', 'road', 'building', 'point'],
        });

        map.addControl(new AMap.Scale({ position: { left: '18px', bottom: '22px' } }));
        map.addControl(new AMap.ToolBar({ position: { right: '18px', top: '18px' } }));

        if (defaultCity !== '全国') {
          map.setCity?.(defaultCity, () => {
            if (!destroyed) map.setZoom?.(12);
          });
        }

        placeSearchRef.current = new AMap.PlaceSearch({
          city: defaultCity,
          citylimit: false,
        });
        autoCompleteRef.current = new AMap.AutoComplete({
          city: defaultCity,
          citylimit: false,
        });

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
      mapRef.current?.destroy?.();
      mapRef.current = null;
      autoCompleteRef.current = null;
      placeSearchRef.current = null;
    };
  }, [clearRouteOverlays, defaultCity, resolveDefaultCityCenter]);

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

  const panel = (
    <div className="amap-route-card">
      <div className="amap-route-card__header">
        <div>
          <span className="amap-route-card__eyebrow">Smart Route</span>
          <h2>路线导航</h2>
          <p>{message}</p>
        </div>
        <button className="amap-route-card__close" type="button" onClick={() => setMobileOpen(false)} aria-label="关闭路线面板">
          ×
        </button>
      </div>

      <div className="amap-route-mode">
        {MODE_OPTIONS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={item.value === mode ? 'is-active' : ''}
            onClick={() => {
              setMode(item.value);
              clearRouteOverlays();
              setRouteSummary(null);
              setRouteSteps([]);
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
            setRouteSteps([]);
            clearRouteOverlays();
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
            setRouteSteps([]);
            clearRouteOverlays();
          }}
          onFocus={() => fetchSuggestions('end', endKeyword)}
          onKeyDown={(event) => event.key === 'Enter' && planRoute()}
        />
        {renderSuggestions('end', endSuggestions)}
      </div>

      <div className="amap-route-selected">
        <div><span>起点</span>{getPoiLabel(startPoi) || '-'}</div>
        <div><span>终点</span>{getPoiLabel(endPoi) || '-'}</div>
      </div>

      <div className="amap-route-actions">
        <button type="button" onClick={planRoute} disabled={loading}>
          {loading ? '规划中...' : '生成路线'}
        </button>
        <button type="button" className="amap-route-actions__secondary" onClick={resetRoute}>
          清除
        </button>
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

      {routeSteps.length > 0 && (
        <div className="amap-route-steps">
          {routeSteps.map((step, index) => (
            <div className="amap-route-step" key={`${step.instruction}-${index}`}>
              <b>{index + 1}</b>
              <div>
                <strong>{step.instruction}</strong>
                <span>{[step.road, Number.isFinite(step.distance) ? formatDistance(step.distance) : ''].filter(Boolean).join(' · ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="amap-route-page">
      <div className="amap-route-map" ref={mapContainerRef} />
      <div className="amap-route-vignette" />
      <div className={`amap-route-panel ${mobileOpen ? 'is-open' : ''}`}>{panel}</div>
      <button className="amap-route-mobile-trigger" type="button" onClick={() => setMobileOpen(true)} aria-label="打开路线面板">
        <span>路线</span>
      </button>
      <div className={`amap-route-mobile-mask ${mobileOpen ? 'is-open' : ''}`} onClick={() => setMobileOpen(false)} />
    </div>
  );
}
