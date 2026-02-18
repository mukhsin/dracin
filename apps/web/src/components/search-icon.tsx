import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useNavigate, useSearch, useLocation } from "@tanstack/react-router";
import { useDebounce } from "../hooks/use-debounce";

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function SearchBox({
  value,
  onChange,
  placeholder = "Search dramas...",
}: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when mounted
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
      />
    </div>
  );
}

export function SearchIcon() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { q?: string };
  const location = useLocation();
  const isOnDramasPage = location.pathname === "/dramas";

  // Debounce search value for URL updates
  const debouncedSearch = useDebounce(searchValue, 300);

  // Initialize search value from URL on mount
  useEffect(() => {
    if (searchParams.q) {
      setSearchValue(searchParams.q);
    }
  }, [searchParams.q]);

  // Only navigate when search box is expanded - avoid redundant URL updates
  // Search value in URL is the source of truth, no need to update it back
  useEffect(() => {
    if (isExpanded) {
      navigate({
        to: "/dramas",
        search: debouncedSearch ? { q: debouncedSearch } : {},
        state: location.state,
      });
    }
  }, [debouncedSearch, isExpanded, navigate, location.state]);

  // Close when clicking outside
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

  // Close on escape key
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
    setIsExpanded(!isExpanded);
    if (isExpanded && isOnDramasPage) {
      if (!searchValue) {
        navigate({ to: "/dramas", search: {} });
      }
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Search Icon Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Toggle search"
        aria-expanded={isExpanded}
        className={`
          flex items-center justify-center p-2 rounded-lg
          transition-all duration-200 ease-out
          hover:bg-accent hover:text-accent-foreground
          ${isExpanded ? "bg-accent text-accent-foreground" : ""}
        `}
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Expandable Search Box */}
      {isExpanded && (
        <div
          className={`
            absolute right-full mr-2
            w-[200px] sm:w-[300px]
            animate-in fade-in slide-in-from-right-2 duration-300
          `}
        >
          <SearchBox
            value={searchValue}
            onChange={setSearchValue}
            placeholder="Search dramas..."
          />
        </div>
      )}
    </div>
  );
}

export default SearchIcon;
