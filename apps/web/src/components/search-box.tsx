import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useDebounce } from "../hooks/use-debounce.js";

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  syncWithUrl?: boolean;
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Search dramas...",
}: SearchBoxProps) {
  // Local state for immediate input updates
  const [inputValue, setInputValue] = useState(value);

  // Debounce the input value (300ms delay)
  const debouncedValue = useDebounce(inputValue, 300);

  // Sync with external value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Call onChange when debounced value changes
  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleClear = () => {
    setInputValue("");
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        role="searchbox"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
      />
      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default SearchBox;
