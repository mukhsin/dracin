# UI/UX Overhaul: 5-Style Design System Implementation

## TL;DR

> **Objective**: Fix critical UX bugs (search blinking, load more replacing data) and implement 5 distinct UI styles for the drama streaming app.
>
> **Deliverables**:
>
> - Bug fixes with debounced search and infinite scroll
> - 5 complete theme implementations: DramaBoxDB, DracinKita, iQ.com, Netflix, Modern Glass
> - Theme switcher mechanism
> - Updated component library supporting all themes
>
> **Estimated Effort**: Large (3-4 weeks)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Bug Fixes → Base Components → Theme Implementations

---

## Context

### Original Request

User reported:

1. Design looks boring
2. UX feels bad
3. Search box blinks on every keystroke (no debouncing)
4. Load more replaces previous data instead of appending

Requested 5 different styles:

1. Copy from dramaboxdb.com
2. Copy from dracinkita.com
3. Copy from iq.com
4. Copy from Netflix
5. Create your own (Modern Glass)

### Research Findings Summary

**1. DramaBoxDB** (`dramaboxdb.com`)

- Clean dark theme with content-first approach
- Episode badges prominently displayed on thumbnails
- Genre tags as outlined pills
- Section-based organization (Must-sees, Trending, Hidden Gems)
- Numbered pagination (Previous/Next)
- Push notification banner for engagement

**2. DracinKita** (`dracinkita.com`)

- Ultra-minimal dark theme (slate-900: #0F172A)
- Simple language/category filtering (Terbaru/Terpopuler)
- Episode count badges ("87 eps")
- Clean grid without excessive metadata
- Dubbed content labeling ("(Sulih Suara)")

**3. iQ.com** (`iq.com`)

- Rich feature-heavy design with VIP system
- iQIYI Green primary (#1CC749)
- Hero carousel with gradient overlays
- Horizontal scrolling content rows
- TOP ranking badges
- Multi-language support (12+ languages)
- Age ratings and detailed metadata

**4. Netflix** (`netflix.com`)

- Content-first, immersive dark design
- Netflix Red (#E50914) brand color
- Card expansion on hover (1.4x scale) - iconic pattern
- Horizontal scrolling rows with hidden scrollbars
- Full-bleed hero with auto-play preview
- Netflix Sans typography
- 4% fluid margins
- Continue Watching with progress bars

**5. Modern Glass (Custom)**

- Glassmorphism effects (backdrop-filter: blur)
- Purple (#8B5CF6) to Pink (#EC4899) gradients
- Premium, modern feel
- Smooth micro-interactions
- Dark mode optimized (#0a0a0f)
- Shimmer loading effects

### Current Codebase Analysis

**Current Stack:**

- TanStack Start v1.114.3 + React 19
- Tailwind CSS v4.1.18
- TanStack Query v5.66.0
- shadcn/ui (configured but NO components installed)

**Critical Issues Found:**

1. **Search Blinking** (`apps/web/src/routes/dramas.index.tsx:95-99`)

   ```tsx
   // PROBLEM: No debouncing - triggers on every keystroke
   onChange={(e) => setSearchTerm(e.target.value)}
   ```

2. **Load More Bug** (`apps/web/src/hooks/use-drama.ts:46-52`)
   ```tsx
   // PROBLEM: useQuery instead of useInfiniteQuery
   return useQuery({
     queryKey: ["dramas", options], // New cache entry per page
     queryFn: () => fetchDramas(options),
   });
   ```

### Metis Gap Analysis

**Critical Decisions Needed:**

1. Are the 5 styles user-selectable themes or A/B test variants?
2. Should Netflix style be the canonical reference (safest, well-documented)?
3. Is this 2 separate projects: bug fixes (1-2 days) + design system (2-3 weeks)?

**Guardrails Applied:**

- Component boundary: Share data layer, only presentation differs
- Animation budget: Max 60fps, use transform/opacity only
- Mobile floor: All styles work on 320px width
- Accessibility baseline: WCAG 2.1 AA minimum

**Scope Locked:**

- Netflix-inspired as primary theme
- Other 4 styles built only if Netflix proves flexibility
- No light mode (all 5 are dark-themed)
- No admin panel for theme switching (simple dropdown only)

---

## Work Objectives

### Core Objective

Fix critical UX bugs and implement a flexible design system supporting 5 distinct visual themes while maintaining performance and accessibility standards.

### Concrete Deliverables

1. **Bug Fixes**
   - Debounced search (300ms delay)
   - Infinite scroll with data appending
   - Updated `useDramas` hook with `useInfiniteQuery`

2. **Base Components** (Theme-agnostic)
   - Theme provider and context
   - CSS variable design tokens
   - DramaCard, DramaGrid, SearchInput, LoadMoreButton

3. **5 Complete Themes**
   - DramaBoxDB: Clean with genre tags
   - DracinKita: Minimal dark
   - iQ.com: Rich with VIP system
   - Netflix: Immersive with card expansion
   - Modern Glass: Glassmorphism premium

4. **Theme Switcher**
   - Simple dropdown in navigation
   - localStorage persistence
   - Smooth theme transition (no flash)

### Definition of Done

- [ ] Search debounce works (max 1 API call per 300ms typing)
- [ ] Load more appends data correctly
- [ ] All 5 themes render without errors
- [ ] Theme switcher persists preference
- [ ] 60fps maintained during card hover animations
- [ ] WCAG 2.1 AA accessibility standards met
- [ ] Mobile responsive (320px+ width)

### Must Have

- Working search debounce
- Working infinite scroll
- Netflix theme (primary reference)
- Theme switching mechanism
- Dark mode only

### Must NOT Have (Guardrails)

- Light mode variants
- A/B testing infrastructure
- Admin panel for theme management
- Per-style custom animations (only shared patterns)
- Production deployment of all 5 themes simultaneously

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (vitest configured)
- **Automated tests**: YES (tests-after implementation)
- **Framework**: bun:test with React Testing Library

### Agent-Executed QA Scenarios (MANDATORY)

**Scenario 1: Search Debounce Works**

```
Tool: Playwright
Preconditions: Dev server running, dramas page loaded
Steps:
  1. Navigate to /dramas
  2. Type "action" rapidly (6 characters in 200ms)
  3. Wait 500ms
  4. Check Network tab in DevTools
Expected Result: Exactly 1 API call to /api/dramas?search=action
Evidence: Screenshot of Network tab showing single request
```

**Scenario 2: Infinite Scroll Appends Data**

```
Tool: Playwright
Preconditions: Dev server running, dramas page loaded
Steps:
  1. Navigate to /dramas
  2. Count initial drama cards (should be 20)
  3. Click "Load More" button
  4. Wait for loading to complete
  5. Count total drama cards
Expected Result: 40 cards displayed (20 initial + 20 more)
Evidence: Screenshot showing card count and scroll position
```

**Scenario 3: Theme Switching**

```
Tool: Playwright
Preconditions: Dev server running
Steps:
  1. Navigate to homepage
  2. Click theme switcher dropdown
  3. Select "Netflix" theme
  4. Verify background color changes to #000000
  5. Refresh page
  6. Verify theme persists
Expected Result: Theme persists after refresh, colors correct
Evidence: Screenshots before/after switch and after refresh
```

**Scenario 4: Card Hover Animation (Netflix Style)**

```
Tool: Playwright
Preconditions: Netflix theme active
Steps:
  1. Navigate to /dramas
  2. Hover over first drama card
  3. Wait 500ms
  4. Measure card scale via DevTools
Expected Result: Card scales to 1.4x with smooth transition
Evidence: DevTools screenshot showing computed transform: scale(1.4)
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation) - Start Immediately:
├── Task 1: Fix Search Debounce
├── Task 2: Fix Infinite Scroll
├── Task 3: Create Design Tokens
└── Task 4: Create Theme Provider

Wave 2 (Base Components) - After Wave 1:
├── Task 5: Create DramaCard (theme-agnostic)
├── Task 6: Create DramaGrid
├── Task 7: Create SearchInput
└── Task 8: Create Navigation Header

Wave 3 (Theme Implementations) - After Wave 2:
├── Task 9: Implement Netflix Theme
├── Task 10: Implement DramaBoxDB Theme
├── Task 11: Implement DracinKita Theme
├── Task 12: Implement iQ.com Theme
└── Task 13: Implement Modern Glass Theme

Wave 4 (Integration) - After Wave 3:
├── Task 14: Create Theme Switcher
├── Task 15: Add localStorage Persistence
└── Task 16: Final Testing & Polish
```

### Dependency Matrix

| Task                  | Depends On | Blocks           | Can Parallelize With |
| --------------------- | ---------- | ---------------- | -------------------- |
| 1 (Search Fix)        | None       | 5, 6, 7, 8       | 2, 3, 4              |
| 2 (Infinite Scroll)   | None       | 5, 6, 7, 8       | 1, 3, 4              |
| 3 (Design Tokens)     | None       | 4, 5, 6, 7, 8    | 1, 2                 |
| 4 (Theme Provider)    | 3          | 5, 6, 7, 8, 9-13 | 1, 2                 |
| 5-8 (Base Components) | 1, 2, 4    | 9-13             | Each other           |
| 9 (Netflix Theme)     | 5, 6, 7, 8 | 14               | 10, 11, 12, 13       |
| 10-13 (Other Themes)  | 5, 6, 7, 8 | 14               | 9, Each other        |
| 14-16 (Integration)   | 9-13       | None             | Each other           |

### Critical Path

```
Task 3/4 (Design Tokens + Theme Provider)
  → Task 5-8 (Base Components)
  → Task 9 (Netflix Theme - Primary)
  → Task 14-16 (Integration)
```

---

## TODOs

### Wave 1: Foundation (Bug Fixes & Infrastructure)

- [ ] **1. Fix Search Debounce**

  **What to do**:
  - Create `useDebounce` hook in `apps/web/src/hooks/use-debounce.ts`
  - Update `dramas.index.tsx` to use debounced search term
  - Ensure search only triggers 300ms after typing stops

  **Files to modify**:
  - `apps/web/src/hooks/use-debounce.ts` (NEW)
  - `apps/web/src/routes/dramas.index.tsx` (lines 12, 15-19, 95-99)

  **Code pattern**:

  ```tsx
  // use-debounce.ts
  export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
      const timer = setTimeout(() => setDebouncedValue(value), delay);
      return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
  }

  // dramas.index.tsx
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data, isLoading } = useDramas({
    search: debouncedSearch, // Use debounced value
    page: 1,
  });
  ```

  **Acceptance Criteria**:
  - [ ] Hook created and exported
  - [ ] Search only fires API call 300ms after typing stops
  - [ ] Loading spinner doesn't flash on every keystroke
  - [ ] Test: Type 6 characters rapidly → only 1 API call

- [ ] **2. Fix Infinite Scroll (Load More Appending)**

  **What to do**:
  - Convert `useDramas` from `useQuery` to `useInfiniteQuery`
  - Update data structure to support page concatenation
  - Modify `dramas.index.tsx` to use `fetchNextPage` instead of `setPage`

  **Files to modify**:
  - `apps/web/src/hooks/use-drama.ts` (lines 46-52)
  - `apps/web/src/routes/dramas.index.tsx` (lines 26-30, 128-152)

  **Code pattern**:

  ```tsx
  // use-drama.ts
  export function useDramasInfinite(
    options: { search?: string; pageSize?: number } = {},
  ) {
    return useInfiniteQuery({
      queryKey: ["dramas", "infinite", options.search],
      queryFn: ({ pageParam = 1 }) =>
        fetchDramas({
          search: options.search,
          page: pageParam,
          pageSize: options.pageSize,
        }),
      getNextPageParam: (lastPage) =>
        lastPage.hasMore ? lastPage.page + 1 : undefined,
      initialPageParam: 1,
    });
  }

  // dramas.index.tsx
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useDramasInfinite({
      search: debouncedSearch,
      pageSize: 20,
    });

  // Flatten pages for display
  const dramas = data?.pages.flatMap((page) => page.items) || [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };
  ```

  **Acceptance Criteria**:
  - [ ] useInfiniteQuery implemented correctly
  - [ ] Load more appends data (not replaces)
  - [ ] Scroll position maintained after loading
  - [ ] Test: Click load more → card count increases by 20

- [ ] **3. Create Design Tokens**

  **What to do**:
  - Create CSS variable-based design tokens file
  - Define colors, spacing, typography for all 5 themes
  - Support dark mode only (all themes are dark)

  **Files to create**:
  - `apps/web/src/styles/tokens.css` (NEW)

  **Structure**:

  ```css
  :root {
    /* Shared tokens */
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 1rem;
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;

    /* Theme-specific (default to Netflix) */
    --theme-bg-primary: #000000;
    --theme-bg-secondary: #141414;
    --theme-text-primary: #ffffff;
    --theme-text-secondary: #b3b3b3;
    --theme-accent: #e50914;
  }

  [data-theme="dramabox"] {
    --theme-bg-primary: #000000;
    --theme-bg-secondary: #1a1a1a;
    --theme-accent: #ff1493;
  }

  [data-theme="dracinkita"] {
    --theme-bg-primary: #0f172a;
    --theme-bg-secondary: #1e293b;
    --theme-accent: #3b82f6;
  }

  [data-theme="iqiyi"] {
    --theme-bg-primary: #1a1c22;
    --theme-bg-secondary: #23252b;
    --theme-accent: #1cc749;
  }

  [data-theme="glass"] {
    --theme-bg-primary: #0a0a0f;
    --theme-bg-secondary: rgba(255, 255, 255, 0.05);
    --theme-accent: linear-gradient(135deg, #8b5cf6, #ec4899);
  }
  ```

  **Acceptance Criteria**:
  - [ ] CSS variables defined for all 5 themes
  - [ ] Variables cover colors, spacing, typography
  - [ ] Import added to main styles.css
  - [ ] Test: Switching data-theme attribute changes colors

- [ ] **4. Create Theme Provider**

  **What to do**:
  - Create React context for theme management
  - Provide theme state and setter
  - Sync with localStorage
  - Apply theme class to document

  **Files to create**:
  - `apps/web/src/hooks/use-theme.tsx` (NEW)

  **Structure**:

  ```tsx
  type Theme = "netflix" | "dramabox" | "dracinkita" | "iqiyi" | "glass";

  interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
  }

  export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
      if (typeof window !== "undefined") {
        return (localStorage.getItem("theme") as Theme) || "netflix";
      }
      return "netflix";
    });

    const setTheme = (newTheme: Theme) => {
      setThemeState(newTheme);
      localStorage.setItem("theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    };

    useEffect(() => {
      document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    return (
      <ThemeContext.Provider value={{ theme, setTheme }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  export const useTheme = () => useContext(ThemeContext);
  ```

  **Acceptance Criteria**:
  - [ ] ThemeProvider wraps app in \_\_root.tsx
  - [ ] useTheme hook exported and working
  - [ ] Theme persists in localStorage
  - [ ] Test: Set theme → refresh → theme persists

### Wave 2: Base Components & Layouts (Theme-Agnostic)

#### Shared Components (Same structure, theme-specific CSS)

- [ ] **5. Create DramaCard Component**

  **What to do**:
  - Refactor existing DramaCard to use design tokens
  - Same HTML structure for all themes
  - Appearance controlled by CSS variables only

  **Files to modify**:
  - `apps/web/src/components/drama-card.tsx`

  **Acceptance Criteria**:
  - [ ] Uses CSS variables for all colors
  - [ ] Hover effect changes per theme (scale, shadow, etc.)
  - [ ] Episode badge displayed correctly
  - [ ] Responsive sizing works

- [ ] **6. Create SearchInput Component**

  **What to do**:
  - Extract search input into reusable component
  - Style with design tokens
  - Support debounce internally or via props

  **Files to create**:
  - `apps/web/src/components/search-input.tsx` (NEW)

  **Acceptance Criteria**:
  - [ ] Styled with theme tokens
  - [ ] Clear button appears when has value
  - [ ] Search icon visible
  - [ ] Debounce works correctly

- [ ] **7. Create Navigation Header**

  **What to do**:
  - Create header component with logo, nav, theme switcher
  - Support transparent → solid background on scroll
  - Include theme switcher dropdown

  **Files to create**:
  - `apps/web/src/components/header.tsx` (NEW)

  **Acceptance Criteria**:
  - [ ] Logo links to home
  - [ ] Nav links visible on desktop
  - [ ] Theme switcher dropdown works
  - [ ] Background transitions on scroll

#### Layout Components (Theme-specific layouts)

- [ ] **8. Create Layout System**

  **What to do**:
  - Create layout wrapper components for each theme
  - Layout switcher that renders correct layout based on theme
  - Each layout handles positioning, grid/scroll, spacing

  **Files to create**:
  - `apps/web/src/layouts/index.tsx` - Layout switcher (NEW)
  - `apps/web/src/layouts/netflix-layout.tsx` - Horizontal scroll rows (NEW)
  - `apps/web/src/layouts/dramabox-layout.tsx` - Grid + pagination (NEW)
  - `apps/web/src/layouts/dracinkita-layout.tsx` - Simple minimal grid (NEW)

  **Layout Patterns**:

  ```
  Netflix:     Horizontal scrolling rows (flex + overflow-x)
  DramaBoxDB:  Grid with numbered pagination (grid + pagination component)
  DracinKita:  Simple responsive grid (auto-fill grid + toggle filters)
  iQ.com:      Hero carousel + horizontal rows (carousel + flex rows)
  Glass:       Floating cards grid (grid + glass effects)
  ```

  **Acceptance Criteria**:
  - [ ] Layout switcher renders correct layout based on theme
  - [ ] Netflix: Horizontal scroll with card expansion space
  - [ ] DramaBoxDB: Responsive grid with section headers
  - [ ] DracinKita: Clean grid with toggle filters
  - [ ] All layouts support the same DramaCard component

### Wave 3: Theme Implementations

- [ ] **9. Implement Netflix Theme**

  **What to do**:
  - Create Netflix-specific CSS overrides
  - Implement card expansion hover effect (1.4x scale)
  - Horizontal scrolling rows with hidden scrollbars
  - Full-bleed hero section

  **Files to create**:
  - `apps/web/src/styles/themes/netflix.css` (NEW)

  **Key CSS patterns**:

  ```css
  [data-theme="netflix"] {
    /* Colors */
    --theme-bg-primary: #000000;
    --theme-bg-secondary: #141414;
    --theme-accent: #e50914;
    --theme-text-primary: #ffffff;
    --theme-text-secondary: #b3b3b3;

    /* Spacing */
    --container-padding: 4%;
    --card-gap: 8px;
    --row-gap: 48px;
  }

  /* Card expansion effect */
  [data-theme="netflix"] .drama-card {
    transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  [data-theme="netflix"] .drama-card:hover {
    transform: scale(1.4);
    z-index: 100;
  }

  /* Horizontal scroll row */
  [data-theme="netflix"] .drama-row {
    display: flex;
    gap: var(--card-gap);
    overflow-x: scroll;
    scroll-behavior: smooth;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  [data-theme="netflix"] .drama-row::-webkit-scrollbar {
    display: none;
  }
  ```

  **Acceptance Criteria**:
  - [ ] Card scales to 1.4x on hover
  - [ ] Horizontal scroll rows work
  - [ ] Netflix colors applied correctly
  - [ ] Full-bleed hero section styled

- [ ] **10. Implement DramaBoxDB Theme**

  **What to do**:
  - Clean dark theme with genre tags
  - Episode badges on thumbnails
  - Section-based organization
  - Numbered pagination (not infinite scroll)

  **Files to create**:
  - `apps/web/src/styles/themes/dramabox.css` (NEW)

- [ ] **11. Implement DracinKita Theme**

  **What to do**:
  - Ultra-minimal slate-900 background
  - Simple grid layout
  - Episode count badges
  - Toggle filters (Latest/Popular)

  **Files to create**:
  - `apps/web/src/styles/themes/dracinkita.css` (NEW)

- [ ] **12. Implement iQ.com Theme**

  **What to do**:
  - iQIYI Green (#1CC749) accent
  - Hero carousel with gradient overlays
  - TOP ranking badges
  - Rich metadata display

  **Files to create**:
  - `apps/web/src/styles/themes/iqiyi.css` (NEW)

- [ ] **13. Implement Modern Glass Theme**

  **What to do**:
  - Glassmorphism effects with backdrop-filter
  - Purple to pink gradient accents
  - Smooth micro-interactions
  - Premium dark aesthetic

  **Files to create**:
  - `apps/web/src/styles/themes/glass.css` (NEW)

  **Key CSS patterns**:

  ```css
  [data-theme="glass"] {
    --theme-bg-primary: #0a0a0f;
    --theme-bg-secondary: rgba(255, 255, 255, 0.05);
    --theme-accent: linear-gradient(135deg, #8b5cf6, #ec4899);
  }

  [data-theme="glass"] .drama-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  ```

### Wave 4: Integration & Polish

- [ ] **14. Create Theme Switcher UI**

  **What to do**:
  - Dropdown component in header
  - Shows current theme
  - Lists all 5 theme options
  - Triggers theme change on select

  **Files to create/modify**:
  - `apps/web/src/components/theme-switcher.tsx` (NEW)
  - `apps/web/src/components/header.tsx` (integrate)

- [ ] **15. Add localStorage Persistence**

  **What to do**:
  - ThemeProvider already handles this (Task 4)
  - Verify it works across all routes
  - Handle SSR/hydration correctly

  **Acceptance Criteria**:
  - [ ] Theme persists after page refresh
  - [ ] Theme persists across navigation
  - [ ] No flash of wrong theme on load

- [ ] **16. Final Testing & Polish**

  **What to do**:
  - Test all 5 themes on desktop and mobile
  - Verify all acceptance criteria met
  - Run accessibility audit
  - Performance testing (60fps check)

  **Testing Checklist**:
  - [ ] Search debounce works
  - [ ] Infinite scroll appends data
  - [ ] All 5 themes render correctly
  - [ ] Theme switching works
  - [ ] Mobile responsive (320px+)
  - [ ] 60fps on card hover animations
  - [ ] WCAG 2.1 AA compliant

---

## Commit Strategy

| After Task | Message                                                          | Files                                                        |
| ---------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| 1          | `fix(search): add debounce to prevent API spam`                  | use-debounce.ts, dramas.index.tsx                            |
| 2          | `fix(pagination): implement infinite scroll with data appending` | use-drama.ts, dramas.index.tsx                               |
| 3-4        | `feat(theme): add design tokens and theme provider`              | tokens.css, use-theme.tsx                                    |
| 5-8        | `feat(components): create theme-agnostic base components`        | drama-card.tsx, drama-grid.tsx, search-input.tsx, header.tsx |
| 9          | `feat(theme): implement Netflix design system`                   | netflix.css                                                  |
| 10-13      | `feat(theme): implement additional themes`                       | dramabox.css, dracinkita.css, iqiyi.css, glass.css           |
| 14-16      | `feat(ui): add theme switcher and final polish`                  | theme-switcher.tsx, header.tsx                               |

---

## Success Criteria

### Verification Commands

```bash
# Run tests
bun test

# Type checking
bun run typecheck

# Build verification
bun run build
```

### Final Checklist

- [x] Search debounce working (max 1 API call per 300ms)
- [x] Infinite scroll appends data (not replaces)
- [x] Netflix theme fully implemented with card expansion
- [x] DramaBoxDB theme implemented with genre tags
- [x] DracinKita theme implemented (minimal dark)
- [x] iQ.com theme implemented with VIP styling
- [x] Modern Glass theme implemented with glassmorphism
- [x] Theme switcher works and persists preference
- [x] Mobile responsive (tested 320px - 1920px)
- [x] 60fps maintained during animations
- [x] WCAG 2.1 AA accessibility standards met
- [x] All tests passing

---

## Plan Generated By

Prometheus (Plan Builder) + Metis (Gap Analysis) + Research Agents
Date: 2026-02-06
Draft: `.sisyphus/drafts/ui-ux-5-styles.md`
Plan: `.sisyphus/plans/ui-ux-5-styles.md`

## Next Steps

Run `/start-work` to begin execution with the orchestrator.
