import { formatDistance, formatDuration } from '@/lib/amap';
import type { RouteSummary } from '../types';

export function RouteSummaryCard({ summary }: { summary: RouteSummary }) {
  const items = [
    { value: formatDistance(summary.distance), label: '预计距离' },
    { value: formatDuration(summary.time), label: '预计用时' },
  ];

  return (
    <div className="mt-3.5 grid grid-cols-2 gap-2.5">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-[#eff6ff] p-3">
          <strong className="block text-base leading-[22px] text-[#101828]">{item.value}</strong>
          <span className="mt-0.5 block text-xs text-[#667085]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
