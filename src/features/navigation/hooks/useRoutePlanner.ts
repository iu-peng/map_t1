import { useCallback, useRef, useState, type RefObject } from 'react';
import {
  createRoutePlanner,
  getFirstRoute,
  getRoutePath,
  isDarkStyle,
  normalizeAddress,
  parseLngLat,
  toAmapLngLat,
  toLngLat,
  type AMapMap,
  type AMapNamespace,
} from '@/lib/amap';
import { resolveRouteColor } from '../constants';
import type { Endpoint, MarkerStyle, PoiPoint, RouteSummary, StyleConfig, TravelMode } from '../types';

type UseRoutePlannerOptions = {
  amapRef: RefObject<AMapNamespace | null>;
  mapRef: RefObject<AMapMap | null>;
  placeSearchRef: RefObject<AMapNamespace | null>;
  mode: TravelMode;
  styleConfig: StyleConfig;
  defaultCity: string;
  startPoi: PoiPoint | null;
  endPoi: PoiPoint | null;
  onMessage: (message: string) => void;
};

function createBadgeMarkerContent(endpoint: Endpoint): string {
  return `<div class="amap-route-badge-marker ${endpoint === 'start' ? 'is-start' : 'is-end'}"><span>${
    endpoint === 'start' ? '起' : '终'
  }</span></div>`;
}

/**
 * 封装路线规划相关的地图副作用：起终点标记、路线覆盖物、规划器调度，
 * 并对外暴露纯粹的操作方法与路线概要状态。
 */
export function useRoutePlanner({
  amapRef,
  mapRef,
  placeSearchRef,
  mode,
  styleConfig,
  defaultCity,
  startPoi,
  endPoi,
  onMessage,
}: UseRoutePlannerOptions) {
  const routePanelRef = useRef<HTMLDivElement>(null);
  const plannerRef = useRef<AMapNamespace | null>(null);
  const startMarkerRef = useRef<AMapNamespace | null>(null);
  const endMarkerRef = useRef<AMapNamespace | null>(null);
  const routeOverlaysRef = useRef<AMapNamespace[]>([]);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);

  const clearRouteOverlays = useCallback(() => {
    const map = mapRef.current;
    if (map && routeOverlaysRef.current.length > 0) {
      routeOverlaysRef.current.forEach((overlay) => map.remove(overlay));
    }
    routeOverlaysRef.current = [];
  }, [mapRef]);

  const clearSelectionMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (startMarkerRef.current) map.remove(startMarkerRef.current);
    if (endMarkerRef.current) map.remove(endMarkerRef.current);
    startMarkerRef.current = null;
    endMarkerRef.current = null;
  }, [mapRef]);

  const setMarker = useCallback(
    (endpoint: Endpoint, poi: PoiPoint, markerStyle: MarkerStyle = styleConfig.markerStyle) => {
      const AMap = amapRef.current;
      const map = mapRef.current;
      if (!AMap || !map) return;

      const markerRef = endpoint === 'start' ? startMarkerRef : endMarkerRef;
      if (markerRef.current) map.remove(markerRef.current);

      const markerOptions: Record<string, unknown> = {
        position: poi.lnglat,
        title: poi.name,
        zIndex: endpoint === 'start' ? 120 : 121,
      };

      if (markerStyle === 'label') {
        markerOptions.label = { content: endpoint === 'start' ? '起点' : '终点', direction: 'top' };
      }

      if (markerStyle === 'badge') {
        markerOptions.content = createBadgeMarkerContent(endpoint);
        markerOptions.offset = new AMap.Pixel(-17, -40);
      }

      const marker = new AMap.Marker(markerOptions);
      map.add(marker);
      markerRef.current = marker;
    },
    [amapRef, mapRef, styleConfig.markerStyle],
  );

  const repaintMarkers = useCallback(
    (markerStyle: MarkerStyle = styleConfig.markerStyle) => {
      clearSelectionMarkers();
      if (startPoi) setMarker('start', startPoi, markerStyle);
      if (endPoi) setMarker('end', endPoi, markerStyle);
    },
    [clearSelectionMarkers, endPoi, setMarker, startPoi, styleConfig.markerStyle],
  );

  const renderVectorRoute = useCallback(
    (route: any, start: PoiPoint, end: PoiPoint) => {
      const AMap = amapRef.current;
      const map = mapRef.current;
      if (!AMap || !map) return false;

      clearRouteOverlays();
      const path = getRoutePath(route);
      if (path.length < 2) return false;

      const overlays: AMapNamespace[] = [];
      const routeColor = resolveRouteColor(styleConfig.routeColor);

      if (styleConfig.routeEffect !== 'simple') {
        overlays.push(
          new AMap.Polyline({
            path,
            strokeColor: '#ffffff',
            strokeOpacity: isDarkStyle(styleConfig.mapStyle) ? 0.44 : 0.92,
            strokeWeight: styleConfig.routeEffect === 'traffic' ? 14 : 11,
            lineJoin: 'round',
            lineCap: 'round',
            zIndex: 58,
          }),
        );
      }

      overlays.push(
        new AMap.Polyline({
          path,
          strokeColor: routeColor,
          strokeOpacity: 0.96,
          strokeWeight: styleConfig.routeEffect === 'traffic' ? 9 : styleConfig.routeEffect === 'simple' ? 6 : 7,
          lineJoin: 'round',
          lineCap: 'round',
          zIndex: 59,
        }),
      );

      routeOverlaysRef.current = overlays;
      map.add(overlays);

      const fitOverlays = [...overlays, startMarkerRef.current, endMarkerRef.current].filter(Boolean);
      map.setFitView(fitOverlays, false, [90, window.innerWidth > 1024 ? 430 : 96, 130, 90], 17);
      setMarker('start', start);
      setMarker('end', end);
      return true;
    },
    [amapRef, mapRef, clearRouteOverlays, setMarker, styleConfig.mapStyle, styleConfig.routeColor, styleConfig.routeEffect],
  );

  const searchPoi = useCallback(
    (keyword: string): Promise<PoiPoint> => {
      const placeSearch = placeSearchRef.current;
      if (!placeSearch) return Promise.reject(new Error('地图服务尚未初始化完成'));

      const lnglat = parseLngLat(keyword);
      if (lnglat) return Promise.resolve({ name: keyword, lnglat });

      return new Promise((resolve, reject) => {
        placeSearch.search(keyword.trim(), (status: string, result: any) => {
          const first = result?.poiList?.pois?.[0];
          const firstLngLat = toLngLat(first?.location);

          if (status !== 'complete' || !firstLngLat) {
            reject(new Error(`没有找到地点：${keyword}`));
            return;
          }

          resolve({
            name: first.name,
            address: [
              normalizeAddress(first.pname),
              normalizeAddress(first.cityname),
              normalizeAddress(first.adname),
              normalizeAddress(first.address),
            ]
              .filter(Boolean)
              .join(''),
            lnglat: firstLngLat,
          });
        });
      });
    },
    [placeSearchRef],
  );

  const clearRoute = useCallback(() => {
    plannerRef.current?.clear?.();
    if (routePanelRef.current) routePanelRef.current.innerHTML = '';
    clearRouteOverlays();
    setRouteSummary(null);
  }, [clearRouteOverlays]);

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
  }, [amapRef, mapRef, defaultCity, mode, styleConfig.routeEffect]);

  /** 执行一次完整规划：落点标记、调用规划器、绘制路线、更新概要。 */
  const planRoute = useCallback(
    async (start: PoiPoint, end: PoiPoint) => {
      const AMap = amapRef.current;
      if (!AMap) throw new Error('地图仍在初始化，请稍后重试');

      setRouteSummary(null);
      clearRouteOverlays();
      setMarker('start', start);
      setMarker('end', end);

      const planner = createPlanner();
      if (!planner) throw new Error('路线规划服务初始化失败');

      await new Promise<void>((resolve, reject) => {
        planner.search(
          toAmapLngLat(AMap, start.lnglat),
          toAmapLngLat(AMap, end.lnglat),
          (status: string, result: any) => {
            if (status !== 'complete') {
              reject(new Error(result?.info || '路线规划失败'));
              return;
            }

            const route = getFirstRoute(result);
            setRouteSummary({ distance: route?.distance, time: route?.time });

            if (mode !== 'transit' && !renderVectorRoute(route, start, end)) {
              reject(new Error('路线已返回，但未解析到可绘制路径'));
              return;
            }

            onMessage(mode === 'transit' ? '公交路线规划完成' : '路线规划完成');
            resolve();
          },
        );
      });
    },
    [amapRef, clearRouteOverlays, createPlanner, mode, onMessage, renderVectorRoute, setMarker],
  );

  // 说明：不在卸载/隐藏时清理路线与标记。地图被 <Activity> 隐藏（display:none）
  // 时会保活，overlay 挂在常驻的地图实例上，切回来即可原样恢复。

  return {
    routePanelRef,
    routeSummary,
    setRouteSummary,
    setMarker,
    repaintMarkers,
    searchPoi,
    clearRoute,
    planRoute,
  };
}
