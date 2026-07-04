import { SuggestionList } from './SuggestionList';
import type { AddressSuggestion } from '../types';

type AddressFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  suggestions: AddressSuggestion[];
  onChange: (value: string) => void;
  onFocus: () => void;
  onEnter: () => void;
  onSelectSuggestion: (item: AddressSuggestion) => void;
};

export function AddressField({
  label,
  value,
  placeholder,
  suggestions,
  onChange,
  onFocus,
  onEnter,
  onSelectSuggestion,
}: AddressFieldProps) {
  return (
    <div className="mt-3.5">
      <span className="mb-1.5 block text-[13px] text-[#475467]">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        className="h-[42px] w-full rounded-[10px] border border-[#d0d5dd] px-3 text-base outline-none focus:border-[#1677ff] focus:shadow-[0_0_0_3px_rgba(22,119,255,0.12)]"
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onKeyDown={(event) => event.key === 'Enter' && onEnter()}
      />
      <SuggestionList items={suggestions} onSelect={onSelectSuggestion} />
    </div>
  );
}
