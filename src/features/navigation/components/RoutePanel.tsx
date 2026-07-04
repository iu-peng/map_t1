import { cn } from '@/lib/utils';
import { getPoiLabel } from '../helpers';
import type { NavigationController } from '../hooks/useNavigation';
import { AddressField } from './AddressField';
import { RouteModeTabs } from './RouteModeTabs';
import { RouteSummaryCard } from './RouteSummaryCard';
import { StyleConfigPanel } from './StyleConfigPanel';

const PRIMARY_BUTTON = 'h-10 rounded-[10px] bg-[#1677ff] text-sm text-white shadow-[0_8px_18px_rgba(22,119,255,0.22)]';
const SECONDARY_BUTTON = 'h-10 rounded-[10px] border border-[#d6dee9] bg-[#e6ebf2] text-sm text-[#334155] hover:bg-[#dbe3ee]';

export function RoutePanel({ controller }: { controller: NavigationController }) {
  const c = controller;

  return (
    <div
      className={cn(
        'flex h-full max-h-full min-h-0 flex-col bg-[#f4f6f8]',
        c.configOpen ? 'overflow-hidden p-0' : 'overflow-auto p-3.5 md:p-[18px]',
      )}
    >
      {c.configOpen ? (
        <StyleConfigPanel
          draft={c.draftConfig}
          onChange={c.changeDraftConfig}
          onClose={c.closeConfig}
          onReset={c.resetDraftConfig}
          onApply={c.applyConfig}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl leading-7 text-[#101828]">路线导航</h2>
              <p className="mt-1 text-[13px] leading-5 text-[#667085]">{c.message}</p>
            </div>
            <button
              type="button"
              onClick={c.openConfig}
              className="h-8 shrink-0 rounded-full border border-[#d6dee9] bg-[#e6ebf2] px-[11px] text-[13px] font-bold text-[#334155] hover:bg-[#dbe3ee]"
            >
              配置
            </button>
          </div>

          <RouteModeTabs value={c.mode} onChange={c.changeMode} />

          <AddressField
            label="起点"
            value={c.startKeyword}
            placeholder={c.startPlaceholder}
            suggestions={c.suggestions.start}
            onChange={(value) => c.changeKeyword('start', value)}
            onFocus={() => c.focusField('start')}
            onEnter={c.planRoute}
            onSelectSuggestion={(item) => c.selectSuggestion('start', item)}
          />

          <AddressField
            label="终点"
            value={c.endKeyword}
            placeholder={c.endPlaceholder}
            suggestions={c.suggestions.end}
            onChange={(value) => c.changeKeyword('end', value)}
            onFocus={() => c.focusField('end')}
            onEnter={c.planRoute}
            onSelectSuggestion={(item) => c.selectSuggestion('end', item)}
          />

          <div className="mt-3 grid gap-1 rounded-[10px] bg-[#f8fafc] px-3 py-2.5 text-xs leading-[18px] text-[#667085]">
            <div>起点：{getPoiLabel(c.startPoi) || '-'}</div>
            <div>终点：{getPoiLabel(c.endPoi) || '-'}</div>
          </div>

          <div className="mt-3.5 grid grid-cols-[1fr_96px] gap-2.5">
            <button
              type="button"
              onClick={c.planRoute}
              disabled={c.loading}
              className={cn(PRIMARY_BUTTON, 'disabled:cursor-not-allowed disabled:opacity-65')}
            >
              {c.loading ? '规划中...' : '开始规划'}
            </button>
            <button type="button" onClick={c.resetRoute} className={SECONDARY_BUTTON}>
              清除路线
            </button>
          </div>

          {c.routeSummary && <RouteSummaryCard summary={c.routeSummary} />}

          {/* 高德会把路线详情 DOM 注入这里，样式见 amap-overrides.css。 */}
          <div
            ref={c.routePanelRef}
            className="amap-route-detail mt-3.5 max-h-[44vh] min-h-[132px] flex-auto overflow-y-auto overflow-x-hidden overscroll-contain [touch-action:pan-y] [-webkit-overflow-scrolling:touch] empty:hidden"
          />
        </>
      )}
    </div>
  );
}
