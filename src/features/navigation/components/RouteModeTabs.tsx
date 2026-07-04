import { cn } from '@/lib/utils';
import { MODE_OPTIONS } from '../constants';
import type { TravelMode } from '../types';

type RouteModeTabsProps = {
  value: TravelMode;
  onChange: (mode: TravelMode) => void;
};

export function RouteModeTabs({ value, onChange }: RouteModeTabsProps) {
  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {MODE_OPTIONS.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            className={cn(
              'h-10 rounded-[10px] border text-sm transition-colors',
              active
                ? 'border-[#1677ff] bg-[#1677ff] text-white shadow-[0_8px_18px_rgba(22,119,255,0.22)]'
                : 'border-[#d6dee9] bg-[#e6ebf2] text-[#334155] hover:bg-[#dbe3ee] hover:text-[#1e293b]',
            )}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
