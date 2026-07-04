import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeCity, type AMapNamespace, type LngLat } from '@/lib/amap';
import { DEFAULT_STYLE_CONFIG } from '../constants';
import { endpointLabel, getPoiLabel, resolveRoutePoi } from '../helpers';
import type { AddressSuggestion, Endpoint, PoiPoint, StyleConfig, TravelMode } from '../types';
import { useAmapMap } from './useAmapMap';
import { usePlaceSuggestions } from './usePlaceSuggestions';
import { useRoutePlanner } from './useRoutePlanner';

/**
 * 导航功能的容器 Hook：集中管理表单 / 配置 / 面板状态，
 * 组合地图、地址联想与路线规划三个子 Hook，向视图暴露只读状态与操作方法。
 */
export function useNavigation() {
  const defaultCity = useMemo(() => normalizeCity(import.meta.env.VITE_AMAP_DEFAULT_CITY), []);

  const [mode, setMode] = useState<TravelMode>('driving');
  const [startKeyword, setStartKeyword] = useState('');
  const [endKeyword, setEndKeyword] = useState('');
  const [startPoi, setStartPoi] = useState<PoiPoint | null>(null);
  const [endPoi, setEndPoi] = useState<PoiPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('请输入起点和终点后开始路线规划');
  const [panelOpen, setPanelOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [styleConfig, setStyleConfig] = useState<StyleConfig>(DEFAULT_STYLE_CONFIG);
  const [draftConfig, setDraftConfig] = useState<StyleConfig>(DEFAULT_STYLE_CONFIG);

  const locationMarkerRef = useRef<AMapNamespace | null>(null);
  const autoPlanOnModeRef = useRef(false);
  const autoPlanOnConfigRef = useRef(false);

  const map = useAmapMap({ defaultCity, onMessage: setMessage });
  const suggestions = usePlaceSuggestions({
    autoCompleteRef: map.autoCompleteRef,
    startKeyword,
    endKeyword,
    startSelectedName: startPoi?.name,
    endSelectedName: endPoi?.name,
    onMessage: setMessage,
  });
  const planner = useRoutePlanner({
    amapRef: map.amapRef,
    mapRef: map.mapRef,
    placeSearchRef: map.placeSearchRef,
    mode,
    styleConfig,
    defaultCity,
    startPoi,
    endPoi,
    onMessage: setMessage,
  });

  // 输入被手动改动后，之前选中的地点即失效。
  useEffect(() => {
    if (startPoi && startPoi.name !== startKeyword) setStartPoi(null);
  }, [startKeyword, startPoi]);
  useEffect(() => {
    if (endPoi && endPoi.name !== endKeyword) setEndPoi(null);
  }, [endKeyword, endPoi]);

  const changeKeyword = useCallback(
    (endpoint: Endpoint, value: string) => {
      if (endpoint === 'start') setStartKeyword(value);
      else setEndKeyword(value);
      planner.setRouteSummary(null);
    },
    [planner],
  );

  const focusField = useCallback(
    (endpoint: Endpoint) => {
      suggestions.requestSuggestions(endpoint, endpoint === 'start' ? startKeyword : endKeyword);
    },
    [suggestions, startKeyword, endKeyword],
  );

  const selectSuggestion = useCallback(
    async (endpoint: Endpoint, item: AddressSuggestion) => {
      try {
        setMessage(`正在确认位置：${item.name}`);

        const poi: PoiPoint = item.lnglat
          ? { name: item.name, address: [item.district, item.address].filter(Boolean).join(''), lnglat: item.lnglat }
          : await planner.searchPoi([item.name, item.district].filter(Boolean).join(' '));

        if (endpoint === 'start') {
          setStartPoi(poi);
          setStartKeyword(poi.name);
        } else {
          setEndPoi(poi);
          setEndKeyword(poi.name);
        }
        suggestions.clearSuggestions(endpoint);

        planner.clearRoute();
        planner.setMarker(endpoint, poi);
        map.mapRef.current?.setZoomAndCenter?.(15, poi.lnglat);
        setMessage(`已选择${endpointLabel(endpoint)}：${getPoiLabel(poi)}`);
      } catch (error) {
        setMessage((error as Error).message || '地点确认失败，请重新选择');
      }
    },
    [planner, suggestions, map.mapRef],
  );

  const planRoute = useCallback(async () => {
    if (!map.ready) {
      setMessage('地图仍在初始化，请稍后重试');
      return;
    }

    if (!startKeyword.trim() || !endKeyword.trim()) {
      setMessage('请先输入起点和终点');
      setPanelOpen(true);
      return;
    }

    try {
      setLoading(true);
      setMessage(mode === 'transit' ? '正在规划公交路线...' : '正在规划路线...');

      const nextStart = resolveRoutePoi('start', startKeyword, startPoi);
      const nextEnd = resolveRoutePoi('end', endKeyword, endPoi);

      setStartPoi(nextStart);
      setEndPoi(nextEnd);
      setStartKeyword(nextStart.name);
      setEndKeyword(nextEnd.name);
      suggestions.clearSuggestions('start');
      suggestions.clearSuggestions('end');

      await planner.planRoute(nextStart, nextEnd);
    } catch (error) {
      setMessage((error as Error).message || '路线规划失败');
      setPanelOpen(true);
    } finally {
      setLoading(false);
    }
  }, [map.ready, mode, startKeyword, endKeyword, startPoi, endPoi, planner, suggestions]);

  const changeMode = useCallback(
    (next: TravelMode) => {
      if (next === mode) return;
      autoPlanOnModeRef.current = Boolean(startPoi && endPoi);
      setMode(next);
      planner.clearRoute();
    },
    [mode, startPoi, endPoi, planner],
  );

  // 出行方式变化后再触发自动规划，确保规划器已使用新的 mode。
  useEffect(() => {
    if (!autoPlanOnModeRef.current) return;
    autoPlanOnModeRef.current = false;
    void planRoute();
    // planRoute 依赖当前渲染闭包，此处仅需在 mode 变化时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const resetRoute = useCallback(() => {
    planner.clearRoute();
    suggestions.clearSuggestions('start');
    suggestions.clearSuggestions('end');
    setMessage(`已清除路线，当前默认城市：${defaultCity}`);
  }, [planner, suggestions, defaultCity]);

  const openConfig = useCallback(() => {
    setDraftConfig(styleConfig);
    setConfigOpen(true);
    setPanelOpen(true);
  }, [styleConfig]);

  const closeConfig = useCallback(() => setConfigOpen(false), []);
  const changeDraftConfig = useCallback((patch: Partial<StyleConfig>) => {
    setDraftConfig((prev) => ({ ...prev, ...patch }));
  }, []);
  const resetDraftConfig = useCallback(() => setDraftConfig(DEFAULT_STYLE_CONFIG), []);

  const applyConfig = useCallback(() => {
    autoPlanOnConfigRef.current = Boolean(startPoi && endPoi);
    setStyleConfig(draftConfig);
    map.mapRef.current?.setMapStyle?.(draftConfig.mapStyle);
    planner.repaintMarkers(draftConfig.markerStyle);
    planner.clearRoute();
    setConfigOpen(false);
    setMessage('样式配置已应用，请重新生成路线查看路线效果');
  }, [draftConfig, startPoi, endPoi, planner, map.mapRef]);

  // 样式应用后（若已有起终点）自动按新样式重新规划。
  useEffect(() => {
    if (!autoPlanOnConfigRef.current) return;
    autoPlanOnConfigRef.current = false;
    void planRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleConfig]);

  const locateCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const mapInstance = map.mapRef.current;
        const AMap = map.amapRef.current;
        if (!mapInstance) return;

        const position: LngLat = [coords.longitude, coords.latitude];
        mapInstance.setZoomAndCenter?.(15, position);

        if (!AMap?.Marker) return;
        if (locationMarkerRef.current) mapInstance.remove?.(locationMarkerRef.current);
        const marker = new AMap.Marker({ position, zIndex: 130, title: '当前位置' });
        mapInstance.add?.(marker);
        locationMarkerRef.current = marker;
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [map.mapRef, map.amapRef]);

  const startPlaceholder = defaultCity === '全国' ? '请输入起点，如 北京南站' : `请输入起点，如 ${defaultCity}站`;
  const endPlaceholder = defaultCity === '全国' ? '请输入终点，如 天安门' : `请输入终点，如 ${defaultCity}市政府`;

  return {
    // 地图 / 面板 refs
    mapContainerRef: map.containerRef,
    routePanelRef: planner.routePanelRef,

    // 状态
    message,
    mode,
    startKeyword,
    endKeyword,
    startPoi,
    endPoi,
    suggestions: suggestions.suggestions,
    loading,
    routeSummary: planner.routeSummary,
    panelOpen,
    configOpen,
    draftConfig,
    startPlaceholder,
    endPlaceholder,

    // 操作
    changeMode,
    changeKeyword,
    focusField,
    selectSuggestion,
    planRoute,
    resetRoute,
    openPanel: () => setPanelOpen(true),
    closePanel: () => setPanelOpen(false),
    openConfig,
    closeConfig,
    changeDraftConfig,
    resetDraftConfig,
    applyConfig,
    locateCurrentPosition,
  };
}

export type NavigationController = ReturnType<typeof useNavigation>;
