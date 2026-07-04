import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  MAP_STYLE_OPTIONS,
  MARKER_STYLE_OPTIONS,
  ROUTE_COLOR_OPTIONS,
  ROUTE_EFFECT_OPTIONS,
} from '../constants';
import type { StyleConfig } from '../types';
import { MapStylePreview, MarkerPreview, RouteColorSwatch, RouteEffectPreview } from './StylePreviews';

type StyleConfigPanelProps = {
  draft: StyleConfig;
  onChange: (patch: Partial<StyleConfig>) => void;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
};

function ConfigCard({ active, onClick, preview, label }: { active: boolean; onClick: () => void; preview: ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-[74px] max-w-[calc(33.333%-6px)] flex-[1_0_92px] rounded-2xl border p-2 text-left transition-[border-color,box-shadow,transform] hover:-translate-y-px',
        active ? 'border-[#1677ff] shadow-[0_0_0_3px_rgba(22,119,255,0.12)]' : 'border-[#e4e7ec]',
      )}
    >
      {preview}
      <strong className="mt-1.5 block text-center text-xs leading-4 text-[#101828]">{label}</strong>
    </button>
  );
}

function ConfigSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h4 className="text-[13px] leading-[18px] text-[#101828]">{title}</h4>
      <div className="flex flex-wrap items-stretch gap-2">{children}</div>
    </section>
  );
}

export function StyleConfigPanel({ draft, onChange, onClose, onReset, onApply }: StyleConfigPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f4f6f8]">
      <div className="flex items-start justify-between gap-3 bg-[#f4f6f8] px-3.5 pb-2.5 pt-3">
        <div>
          <h3 className="text-lg leading-6 text-[#101828]">样式配置</h3>
          <p className="mt-0.5 text-xs leading-[17px] text-[#667085]">选择后确认应用，路线颜色会在重新规划后生效。</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭配置"
          className="h-8 w-8 shrink-0 rounded-full bg-[#f2f4f7] text-2xl leading-[30px] text-[#667085]"
        >
          ×
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain px-3.5 pb-4 [touch-action:pan-y] [-webkit-overflow-scrolling:touch]">
        <ConfigSection title="地图底图">
          {MAP_STYLE_OPTIONS.map((item) => (
            <ConfigCard
              key={item.value}
              active={draft.mapStyle === item.value}
              onClick={() => onChange({ mapStyle: item.value })}
              preview={<MapStylePreview preview={item.preview} />}
              label={item.label}
            />
          ))}
        </ConfigSection>

        <ConfigSection title="路线效果">
          {ROUTE_EFFECT_OPTIONS.map((item) => (
            <ConfigCard
              key={item.value}
              active={draft.routeEffect === item.value}
              onClick={() => onChange({ routeEffect: item.value })}
              preview={<RouteEffectPreview preview={item.preview} />}
              label={item.label}
            />
          ))}
        </ConfigSection>

        <ConfigSection title="路线颜色">
          {ROUTE_COLOR_OPTIONS.map((item) => (
            <ConfigCard
              key={item.value}
              active={draft.routeColor === item.value}
              onClick={() => onChange({ routeColor: item.value })}
              preview={<RouteColorSwatch color={item.color} />}
              label={item.label}
            />
          ))}
        </ConfigSection>

        <ConfigSection title="起终点">
          {MARKER_STYLE_OPTIONS.map((item) => (
            <ConfigCard
              key={item.value}
              active={draft.markerStyle === item.value}
              onClick={() => onChange({ markerStyle: item.value })}
              preview={<MarkerPreview preview={item.preview} />}
              label={item.label}
            />
          ))}
        </ConfigSection>
      </div>

      <div className="grid shrink-0 grid-cols-[110px_1fr] gap-2.5 border-t border-[#e5e7eb] bg-[#f4f6f8] px-3.5 pb-3 pt-2.5">
        <button
          type="button"
          onClick={onReset}
          className="h-10 rounded-[10px] border border-[#d6dee9] bg-[#e6ebf2] text-sm text-[#334155] hover:bg-[#dbe3ee]"
        >
          恢复默认
        </button>
        <button
          type="button"
          onClick={onApply}
          className="h-10 rounded-[10px] bg-[#1677ff] text-sm text-white shadow-[0_8px_18px_rgba(22,119,255,0.22)]"
        >
          确认应用
        </button>
      </div>
    </div>
  );
}
