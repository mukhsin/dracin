import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dramabox" | "dracinkita" | "iqiyi" | "netflix" | "glass";

export const DEFAULT_THEME: Theme = "dracinkita";

const STORAGE_KEY = "dracin-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isMounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isMounted, setIsMounted] = useState(false);

  // Load theme from localStorage on mount (SSR-safe)
  useEffect(() => {
    setIsMounted(true);

    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored && isValidTheme(stored)) {
        setThemeState(stored);
        applyThemeToDocument(stored);
      } else {
        applyThemeToDocument(defaultTheme);
      }
    } catch (error) {
      // localStorage not available (SSR or private browsing)
      applyThemeToDocument(defaultTheme);
    }
  }, [defaultTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeToDocument(newTheme);

    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (error) {
      // localStorage not available
      console.warn("Failed to save theme preference:", error);
    }
  };

  const value: ThemeContextValue = {
    theme,
    setTheme,
    isMounted,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Helper function to validate theme
function isValidTheme(theme: string): theme is Theme {
  return ["dramabox", "dracinkita", "iqiyi", "netflix", "glass"].includes(
    theme,
  );
}

// Helper function to apply theme to document
export function applyThemeToDocument(theme: Theme): void {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

// Export theme info for UI display
export const THEME_INFO: Record<
  Theme,
  { name: string; description: string; color: string }
> = {
  dramabox: {
    name: "DramaBoxDB",
    description: "Clean dark with pink accents",
    color: "#ff1493",
  },
  dracinkita: {
    name: "DracinKita",
    description: "Ultra-minimal dark",
    color: "#3b82f6",
  },
  iqiyi: {
    name: "iQ.com",
    description: "Feature-rich with green VIP",
    color: "#1cc749",
  },
  netflix: {
    name: "Netflix",
    description: "Immersive with card expansion",
    color: "#e50914",
  },
  glass: {
    name: "Modern Glass",
    description: "Glassmorphism with purple gradient",
    color: "#8b5cf6",
  },
};

// Export theme list
export const THEMES: Theme[] = [
  "dracinkita",
  "dramabox",
  "iqiyi",
  "netflix",
  "glass",
];
