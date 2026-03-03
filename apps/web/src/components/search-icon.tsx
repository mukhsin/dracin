import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useNavigate, useSearch, useLocation } from "@tanstack/react-router";
import { useDebounce } from "../hooks/use-debounce";

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
}

function SearchBox({
  value,
  onChange,
  onClear,
  placeholder = "Search dramas...",
}: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-[#1a1a1a] text-white text-sm focus:outline-none border border-gray-700 focus-visible:border-primary"
        style={{ borderRadius: "0" }}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            if (onClear) {
              onClear();
              return;
            }

            onChange("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function SearchIcon() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const lastEmittedRef = useRef<string | undefined>(undefined);
  const searchValueOnOpenRef = useRef<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as {
    q?: string;
    t?: string;
  };
  const location = useLocation();
  const isOnDramasPage = location.pathname === "/dramas";
  const debouncedSearch = useDebounce(searchValue, 300);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Sync searchValue with URL on initial load / hydration
  useEffect(() => {
    if (!isHydrated) return;

    const nextSearchValue = searchParams.q ?? "";
    setSearchValue(nextSearchValue);
    lastEmittedRef.current = nextSearchValue;
  }, [isHydrated, searchParams.q]);

  // Navigate when debounced search changes
  useEffect(() => {
    if (!isHydrated || !isExpanded) return;
    // Skip if same as last emitted
    if (debouncedSearch === lastEmittedRef.current) return;

    // Don't navigate to empty if we're still typing (searchValue differs from debounced)
    if (!debouncedSearch && searchValue !== debouncedSearch) return;
    // Don't navigate to empty if we had search on open (clear→type transition)
    if (!debouncedSearch && searchValueOnOpenRef.current !== "") {
      return;
    }

    lastEmittedRef.current = debouncedSearch;
    navigate({
      to: "/dramas",
      search: debouncedSearch ? { q: debouncedSearch } : {},
    });
  }, [debouncedSearch, isExpanded, isHydrated, navigate, searchValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isExpanded]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isExpanded]);

  const handleToggle = () => {
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);
    if (willExpand) {
      // Remember what searchValue was when opening
      searchValueOnOpenRef.current = searchValue;
    }

    // When closing on dramas page, clear search if value hasn't changed from when opened
    if (
      !willExpand &&
      isOnDramasPage &&
      searchValue === searchValueOnOpenRef.current
    ) {
      navigate({ to: "/dramas", search: {} });
    }
  };

  const handleClearSearch = () => {
    setSearchValue("");
    setIsExpanded(false);
    searchValueOnOpenRef.current = "";
    lastEmittedRef.current = "";
    navigate({ to: "/dramas", search: {} });
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Toggle search"
        aria-expanded={isExpanded}
        className={`
          flex items-center justify-center p-2
          transition-all duration-200 ease-out
          hover:text-primary
          ${isExpanded ? "text-primary" : "text-gray-400"}
        `}
        style={{ borderRadius: "0" }}
      >
        <Search className="w-5 h-5" />
      </button>

      {isExpanded && (
        <div
          className={`
            absolute right-full mr-2
            w-[200px] sm:w-[300px]
            animate-in fade-in slide-in-from-right-2 duration-200
          `}
        >
          <SearchBox
            value={searchValue}
            onChange={setSearchValue}
            onClear={handleClearSearch}
            placeholder="Search dramas..."
          />
        </div>
      )}
    </div>
  );
}

export default SearchIcon;
