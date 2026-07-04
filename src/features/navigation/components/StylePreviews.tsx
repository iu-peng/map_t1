import { cn } from '@/lib/utils';

const PREVIEW_BOX = 'relative block h-8 overflow-hidden rounded-[10px]';

const MAP_GRADIENTS: Record<string, string> = {
  normal: 'linear-gradient(135deg,#dbeafe,#dcfce7)',
  fresh: 'linear-gradient(135deg,#e0f2fe,#f8fafc)',
  smoke: 'linear-gradient(135deg,#e5e7eb,#f8fafc)',
  dark: 'linear-gradient(135deg,#0f172a,#334155)',
  darkblue: 'linear-gradient(135deg,#153e75,#2563eb)',
  blue: 'linear-gradient(135deg,#1d4ed8,#7dd3fc)',
};

/** 底图缩略图：渐变背景 + 两条示意「道路」。 */
export function MapStylePreview({ preview }: { preview: string }) {
  return (
    <span className={PREVIEW_BOX} style={{ background: MAP_GRADIENTS[preview] ?? '#edf2f7' }}>
      <span className="absolute -inset-x-1.5 top-3.5 h-1.5 -rotate-[8deg] rounded-full bg-white/90" />
      <span className="absolute -top-2 left-[58%] h-[54px] w-1.5 rotate-[18deg] rounded-full bg-white/70" />
    </span>
  );
}

/** 路线效果缩略图：底色 + 灰/蓝双线的不同表现。 */
export function RouteEffectPreview({ preview }: { preview: string }) {
  return (
    <span className={cn(PREVIEW_BOX, 'bg-[#f8fafc]')}>
      {preview !== 'simple' && (
        <span
          className={cn(
            'absolute inset-x-2.5 rounded-full',
            preview === 'outline' ? 'top-3 h-[11px] bg-[#dbeafe]' : 'top-[15px] h-[5px] bg-[#e2e8f0]',
          )}
        />
      )}
      <span
        className={cn(
          'absolute inset-x-2.5 rounded-full bg-[#1677ff]',
          preview === 'highlight' ? 'top-[13px] h-2 shadow-[0_0_12px_rgba(22,119,255,0.45)]' : 'top-[15px] h-[5px]',
        )}
      />
    </span>
  );
}

/** 路线颜色缩略图：一条对应颜色的圆角线。 */
export function RouteColorSwatch({ color }: { color: string }) {
  return (
    <span className={PREVIEW_BOX} style={{ background: 'transparent' }}>
      <span
        className="absolute inset-x-2 top-3.5 h-[7px] rounded-full"
        style={{ background: color, boxShadow: `0 4px 12px color-mix(in srgb, ${color} 42%, transparent)` }}
      />
    </span>
  );
}

/** 起终点标记缩略图：默认水滴 / 标签 / 双徽标。 */
export function MarkerPreview({ preview }: { preview: string }) {
  return (
    <span className={cn(PREVIEW_BOX, 'grid place-items-center bg-[#f8fafc]')}>
      {preview === 'default' && <span className="h-4 w-4 -rotate-45 rounded-[50%_50%_50%_4px] bg-[#1677ff]" />}

      {preview === 'label' && (
        <span className="relative grid h-4 w-[30px] place-items-center rounded-full bg-[#e0f2fe]">
          <span className="h-2 w-2 rounded-full bg-[#1677ff]" />
        </span>
      )}

      {preview === 'badge' && (
        <>
          <span className="absolute left-6 h-[18px] w-[18px] -rotate-45 rounded-[50%_50%_50%_5px] border-2 border-white bg-[#12b76a]" />
          <span className="absolute right-6 h-[18px] w-[18px] -rotate-45 rounded-[50%_50%_50%_5px] border-2 border-white bg-[#f04438]" />
        </>
      )}
    </span>
  );
}
