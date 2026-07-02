import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoutePlanner, formatDistance, formatDuration, loadAMap, TravelMode } from '../../utils/amapLoader';
import './AmapNavigationPage.css';

type PoiPoint = {
  name: string;
  address?: string;
  lnglat: [number, number];
};

type RouteSummary = {
  distance?: number;
  time?: number;
};

const MODE_OPTIONS: Array<{ label: string; value: TravelMode }> = [
  { label: '驾车', value: 'driving' },
  { label: '骑行', value: 'riding' },
  { label: '步行', value: 'walking' },
];

const DEFAULT_CENTER: [number, number] = [116.397428, 39.90923];

function parseLngLat(value: string): [number, number] | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const lng = Number(match[1]);
  const lat = Number(match[2]);
  if (Number.isNaN(lng) || Number.isNaN(lat)) return null;
  return [lng, lat];
}

function getPoiLabel(poi?: PoiPoint | null) {
  if (!poi) return '';
  return poi.address ? `${poi.name}（${poi.address}）` : poi.name;
}

export default function AmapNavigationPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const routePanelRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const amapRef = useRef<any>(null);
  const plannerRef = useRef<any>(null);
  const placeSearchRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);

  const [mode, setMode] = useState<TravelMode>('driving');
  const [startKeyword, setStartKeyword] = useState('');
  const [endKeyword, setEndKeyword] = useState('');
  const [startPoi, setStartPoi] = useState<PoiPoint | null>(null);
  const [endPoi, setEndPoi] = useState<PoiPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('请输入起点和终点后开始路线规划');
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const defaultCity = useMemo(() => import.meta.env.VITE_AMAP_DEFAULT_CITY || '全国', []);

  const setMarker = useCallback((type: 'start' | 'end', poi: PoiPoint) => {
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return;

    const oldMarker = type === 'start' ? startMarkerRef.current : endMarkerRef.current;
    if (oldMarker) map.remove(oldMarker);

    const marker = new AMap.Marker({
      position: poi.lnglat,
      title: poi.name,
      label: {
        content: type === 'start' ? '起点' : '终点',
        direction: 'top',
      },
    });

    map.add(marker);
    map.setFitView([marker]);

    if (type === 'start') startMarkerRef.current = marker;
    if (type === 'end') endMarkerRef.current = marker;
  }, []);

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

        if (status !== 'complete' || !first?.location) {
          reject(new Error(`没有找到地点：${keyword}`));
          return;
        }

        resolve({
          name: first.name,
          address: Array.isArray(first.address) ? first.address.join('') : first.address,
          lnglat: [first.location.lng, first.location.lat],
        });
      });
    });
  }, []);

  const createPlanner = useCallback(() => {
    const AMap = amapRef.current;
    const map = mapRef.current;
    const panel = routePanelRef.current;
    if (!AMap || !map || !panel) return null;

    plannerRef.current?.clear?.();
    panel.innerHTML = '';
    plannerRef.current = createRoutePlanner(AMap, mode, map, panel);
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
      return;
    }

    try {
      setLoading(true);
      setMessage('正在搜索地点并规划路线...');
      setRouteSummary(null);

      const [nextStartPoi, nextEndPoi] = await Promise.all([
        startPoi?.name === startKeyword ? Promise.resolve(startPoi) : searchPoi(startKeyword),
        endPoi?.name === endKeyword ? Promise.resolve(endPoi) : searchPoi(endKeyword),
      ]);

      setStartPoi(nextStartPoi);
      setEndPoi(nextEndPoi);
      setStartKeyword(nextStartPoi.name);
      setEndKeyword(nextEndPoi.name);
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
          setMessage('路线规划完成');
          resolve();
        });
      });

      setMobileOpen(false);
    } catch (error) {
      const err = error as Error;
      setMessage(err.message || '路线规划失败');
    } finally {
      setLoading(false);
    }
  }, [createPlanner, endKeyword, endPoi, searchPoi, setMarker, startKeyword, startPoi]);

  const resetRoute = useCallback(() => {
    plannerRef.current?.clear?.();
    routePanelRef.current && (routePanelRef.current.innerHTML = '');
    setRouteSummary(null);
    setMessage('已清除路线，可重新输入起终点');
  }, []);

  useEffect(() => {
    let destroyed = false;

    async function initMap() {
      try {
        const AMap = await loadAMap();
        if (destroyed || !mapContainerRef.current) return;

        amapRef.current = AMap;
        const map = new AMap.Map(mapContainerRef.current, {
          zoom: 12,
          center: DEFAULT_CENTER,
          viewMode: '2D',
          resizeEnable: true,
        });

        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({ position: { right: '24px', top: '24px' } }));

        placeSearchRef.current = new AMap.PlaceSearch({
          city: defaultCity,
          citylimit: false,
        });

        mapRef.current = map;
        setMessage('地图加载完成，请输入起点和终点');
      } catch (error) {
        const err = error as Error;
        setMessage(err.message || '地图加载失败，请检查高德 Key 配置');
      }
    }

    initMap();

    return () => {
      destroyed = true;
      plannerRef.current?.clear?.();
      mapRef.current?.destroy?.();
      mapRef.current = null;
    };
  }, [defaultCity]);

  useEffect(() => {
    if (startPoi && startPoi.name !== startKeyword) setStartPoi(null);
  }, [startKeyword, startPoi]);

  useEffect(() => {
    if (endPoi && endPoi.name !== endKeyword) setEndPoi(null);
  }, [endKeyword, endPoi]);

  const panel = (
    <div className="amap-route-card">
      <div className="amap-route-card__header">
        <div>
          <h2>路线导航</h2>
          <p>{message}</p>
        </div>
        <button className="amap-route-card__close" type="button" onClick={() => setMobileOpen(false)}>
          ×
        </button>
      </div>

      <div className="amap-route-mode">
        {MODE_OPTIONS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={item.value === mode ? 'is-active' : ''}
            onClick={() => setMode(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="amap-route-field">
        <span>起点</span>
        <input
          value={startKeyword}
          placeholder="请输入起点，如 北京南站"
          onChange={(event) => setStartKeyword(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && planRoute()}
        />
      </label>

      <label className="amap-route-field">
        <span>终点</span>
        <input
          value={endKeyword}
          placeholder="请输入终点，如 天安门"
          onChange={(event) => setEndKeyword(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && planRoute()}
        />
      </label>

      <div className="amap-route-selected">
        <div>起点：{getPoiLabel(startPoi) || '-'}</div>
        <div>终点：{getPoiLabel(endPoi) || '-'}</div>
      </div>

      <div className="amap-route-actions">
        <button type="button" onClick={planRoute} disabled={loading}>
          {loading ? '规划中...' : '开始规划'}
        </button>
        <button type="button" className="amap-route-actions__secondary" onClick={resetRoute}>
          清除路线
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

      <div className="amap-route-detail" ref={routePanelRef} />
    </div>
  );

  return (
    <div className="amap-route-page">
      <div className="amap-route-map" ref={mapContainerRef} />
      <div className={`amap-route-panel ${mobileOpen ? 'is-open' : ''}`}>{panel}</div>
      <button className="amap-route-mobile-trigger" type="button" onClick={() => setMobileOpen(true)}>
        路线
      </button>
      <div className={`amap-route-mobile-mask ${mobileOpen ? 'is-open' : ''}`} onClick={() => setMobileOpen(false)} />
    </div>
  );
}
