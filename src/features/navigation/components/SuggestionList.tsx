import { getSuggestionText } from '../helpers';
import type { AddressSuggestion } from '../types';

type SuggestionListProps = {
  items: AddressSuggestion[];
  onSelect: (item: AddressSuggestion) => void;
};

export function SuggestionList({ items, onSelect }: SuggestionListProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-1.5 max-h-56 overflow-auto overscroll-contain rounded-xl border border-[#e4e7ec] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.12)] [touch-action:pan-y] [-webkit-overflow-scrolling:touch]">
      {items.map((item, index) => (
        <button
          key={`${item.id || item.name}-${index}`}
          type="button"
          className="block w-full border-b border-[#f2f4f7] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#f8fafc]"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(item)}
        >
          <strong className="block text-sm leading-5 text-[#101828]">{item.name}</strong>
          <span className="mt-0.5 block text-xs leading-[18px] text-[#667085]">{getSuggestionText(item)}</span>
        </button>
      ))}
    </div>
  );
}
