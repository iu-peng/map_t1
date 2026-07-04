import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { normalizeAddress, parseLngLat, toLngLat, type AMapNamespace } from '@/lib/amap';
import type { AddressSuggestion, Endpoint } from '../types';

const SUGGESTION_DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 8;

type UsePlaceSuggestionsOptions = {
  autoCompleteRef: RefObject<AMapNamespace | null>;
  startKeyword: string;
  endKeyword: string;
  /** 已确认的起点名称，与关键字一致时不再联想。 */
  startSelectedName?: string;
  endSelectedName?: string;
  onMessage: (message: string) => void;
};

type UsePlaceSuggestionsResult = {
  suggestions: Record<Endpoint, AddressSuggestion[]>;
  /** 立即联想（用于输入框聚焦时）。 */
  requestSuggestions: (endpoint: Endpoint, keyword: string) => void;
  clearSuggestions: (endpoint: Endpoint) => void;
};

function normalizeSuggestion(tip: any): AddressSuggestion | null {
  if (!tip?.name || tip.name === '请输入关键字') return null;

  return {
    id: tip.id,
    name: tip.name,
    district: normalizeAddress(tip.district),
    address: normalizeAddress(tip.address),
    lnglat: toLngLat(tip.location),
  };
}

/** 起点 / 终点输入框的地址联想，内置去抖与请求竞态保护。 */
export function usePlaceSuggestions({
  autoCompleteRef,
  startKeyword,
  endKeyword,
  startSelectedName,
  endSelectedName,
  onMessage,
}: UsePlaceSuggestionsOptions): UsePlaceSuggestionsResult {
  const [suggestions, setSuggestions] = useState<Record<Endpoint, AddressSuggestion[]>>({ start: [], end: [] });
  const requestSeqRef = useRef<Record<Endpoint, number>>({ start: 0, end: 0 });

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const clearSuggestions = useCallback((endpoint: Endpoint) => {
    setSuggestions((prev) => (prev[endpoint].length === 0 ? prev : { ...prev, [endpoint]: [] }));
  }, []);

  const requestSuggestions = useCallback(
    (endpoint: Endpoint, keyword: string) => {
      const autoComplete = autoCompleteRef.current;
      const trimmed = keyword.trim();
      const currentRequest = ++requestSeqRef.current[endpoint];

      if (!trimmed || parseLngLat(trimmed)) {
        clearSuggestions(endpoint);
        return;
      }

      if (!autoComplete) return;

      autoComplete.search(trimmed, (status: string, result: any) => {
        if (currentRequest !== requestSeqRef.current[endpoint]) return;
        if (status !== 'complete') {
          clearSuggestions(endpoint);
          return;
        }

        const next: AddressSuggestion[] = (result?.tips || [])
          .map(normalizeSuggestion)
          .filter((item: AddressSuggestion | null): item is AddressSuggestion =>
            Boolean(item?.name && (item.lnglat || item.district || item.address)),
          )
          .slice(0, MAX_SUGGESTIONS);

        setSuggestions((prev) => ({ ...prev, [endpoint]: next }));
        if (next.length > 0) onMessageRef.current('请从下方候选地址中选择具体位置');
      });
    },
    [autoCompleteRef, clearSuggestions],
  );

  useDebouncedSuggestions('start', startKeyword, startSelectedName, requestSuggestions, clearSuggestions);
  useDebouncedSuggestions('end', endKeyword, endSelectedName, requestSuggestions, clearSuggestions);

  return { suggestions, requestSuggestions, clearSuggestions };
}

function useDebouncedSuggestions(
  endpoint: Endpoint,
  keyword: string,
  selectedName: string | undefined,
  requestSuggestions: (endpoint: Endpoint, keyword: string) => void,
  clearSuggestions: (endpoint: Endpoint) => void,
) {
  useEffect(() => {
    const trimmed = keyword.trim();
    if (!trimmed || selectedName === trimmed) {
      clearSuggestions(endpoint);
      return;
    }

    const timer = window.setTimeout(() => requestSuggestions(endpoint, trimmed), SUGGESTION_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [endpoint, keyword, selectedName, requestSuggestions, clearSuggestions]);
}
