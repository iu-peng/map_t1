import { Navigation2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MapFloatingControlsProps = {
  /** 面板展开时隐藏「打开面板」按钮。 */
  hidden: boolean;
  onOpenPanel: () => void;
  onLocate: () => void;
};

const FLOATING_BUTTON = 'absolute z-[45] grid h-11 w-11 place-items-center rounded-full shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition-[opacity,transform]';

export function MapFloatingControls({ hidden, onOpenPanel, onLocate }: MapFloatingControlsProps) {
  return (
    <>
      <Button
        type="button"
        size="icon"
        aria-label="打开导航设置"
        onClick={onOpenPanel}
        className={cn(
          FLOATING_BUTTON,
          'right-[max(14px,env(safe-area-inset-right))] top-[calc(14px+env(safe-area-inset-top))]',
          hidden && 'pointer-events-none scale-95 opacity-0',
        )}
      >
        <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
      </Button>

      <Button
        type="button"
        size="icon"
        aria-label="定位当前位置"
        onClick={onLocate}
        className={cn(FLOATING_BUTTON, 'bottom-9 left-[18px]')}
      >
        <Navigation2 className="h-5 w-5" aria-hidden="true" />
      </Button>
    </>
  );
}
