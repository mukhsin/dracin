import { useState, useRef, useEffect } from "react";
import { Palette, Check, ChevronDown } from "lucide-react";
import {
  useTheme,
  THEME_INFO,
  THEMES,
  type Theme,
} from "../contexts/theme-context.js";

export function ThemeSwitcher() {
  const { theme, setTheme, isMounted } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  function handleKeyDown(event: React.KeyboardEvent) {
    if (!isOpen) return;

    switch (event.key) {
      case "Escape":
        setIsOpen(false);
        break;
      case "ArrowDown":
        event.preventDefault();
        {
          const currentIndex = THEMES.indexOf(theme);
          const nextIndex = (currentIndex + 1) % THEMES.length;
          setTheme(THEMES[nextIndex]);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        {
          const currentIndex = THEMES.indexOf(theme);
          const prevIndex =
            currentIndex === 0 ? THEMES.length - 1 : currentIndex - 1;
          setTheme(THEMES[prevIndex]);
        }
        break;
    }
  }

  function handleThemeSelect(selectedTheme: Theme) {
    setTheme(selectedTheme);
    setIsOpen(false);
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return <div className="w-9 h-9 rounded-md bg-accent animate-pulse" />;
  }

  const currentThemeInfo = THEME_INFO[theme];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent hover:bg-accent/80 transition-all group"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select theme"
      >
        <div
          className="w-4 h-4 rounded-full ring-2 ring-offset-2 ring-offset-background"
          style={{
            backgroundColor: currentThemeInfo.color,
            boxShadow: `0 0 0 2px ${currentThemeInfo.color}`,
          }}
        />
        <span className="hidden sm:inline text-sm font-medium">
          {currentThemeInfo.name}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-lg bg-popover border shadow-lg z-50 py-1"
          role="listbox"
          aria-label="Theme options"
        >
          <div className="px-3 py-2 border-b">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Palette className="w-4 h-4" />
              <span>Choose Theme</span>
            </div>
          </div>

          <div className="py-1">
            {THEMES.map((themeOption) => {
              const info = THEME_INFO[themeOption];
              const isSelected = theme === themeOption;

              return (
                <button
                  key={themeOption}
                  onClick={() => handleThemeSelect(themeOption)}
                  className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors text-left ${
                    isSelected ? "bg-accent/50" : ""
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  {/* Color Preview */}
                  <div
                    className={`w-5 h-5 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-background ${
                      isSelected ? "ring-primary" : "ring-transparent"
                    }`}
                    style={{ backgroundColor: info.color }}
                  />

                  {/* Theme Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{info.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {info.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeSwitcher;
