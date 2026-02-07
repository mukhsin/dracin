# Draft: 5 UI/UX Style Research for Drama Streaming App

## Research Summary

### Current Codebase Issues Identified

1. **Search Blinking Issue**
   - Location: `apps/web/src/routes/dramas.index.tsx` (lines 95-99)
   - Problem: No debouncing on search input
   - Current code: `onChange={(e) => setSearchTerm(e.target.value)}` triggers immediate state update
   - Impact: Every keystroke triggers a re-render and potential API call

2. **Load More Replacing Data**
   - Location: `apps/web/src/hooks/use-drama.ts` (lines 46-52)
   - Problem: TanStack Query with page in queryKey replaces data instead of appending
   - Current queryKey: `["dramas", options]` where options includes page
   - Impact: Page 2 data replaces Page 1 data instead of concatenating

3. **Current Design System**
   - Primary: Blue theme (`hsl(221.2 83.2% 53.3%)`)
   - Light background (`hsl(0 0% 100%)`)
   - Standard Tailwind CSS with shadcn/ui
   - Card-based grid layout (4 columns on XL)

---

## Style 1: DramaBoxDB-Inspired (Clean & Modern)

### Design Characteristics

- Clean white background with subtle gradients
- Large, prominent drama cards with 2:3 aspect ratio
- Genre tags as pill badges (Forbidden Love, Love Triangle, Mafia)
- Episode count prominently displayed ("56 Episodes")
- Section-based organization (Must-sees, Trending, Hidden Gems)
- "Previous/Next" pagination with page numbers
- Push notification prompt for engagement

### Color Palette

- Background: White (#FFFFFF) with subtle gray sections
- Primary: Deep red/pink accent for branding
- Text: Dark gray (#1a1a1a) for titles, medium gray for descriptions
- Tags: Light gray background with dark text
- Cards: White with subtle shadow

### Typography

- Titles: Bold, 18-24px
- Descriptions: Regular, 14-16px, line-clamp-3
- Tags: Medium, 12px uppercase

### Key Features to Implement

1. Horizontal scrolling sections for categories
2. Genre tag pills on each card
3. Episode count badge
4. Section headers with "More" links
5. Push notification subscription UI

---

## Style 2: DracinKita-Inspired (Minimal & Fast)

### Design Characteristics

- Ultra-minimalist design
- Simple language/category filtering (Terbaru/Terpopuler)
- Clean grid without excessive metadata
- Fast, lightweight feel
- Focus on content discovery

### Color Palette

- Background: White or very light gray
- Primary: Simple accent color (possibly green or blue)
- Text: Dark gray/black
- Minimal use of colors

### Typography

- Clean sans-serif
- Large titles, minimal description text

### Key Features to Implement

1. Simple toggle filters (Latest/Popular)
2. Minimal card design (just image + title)
3. Fast loading states
4. Language-based categorization

---

## Style 3: iQ.com-Inspired (Rich & Feature-Heavy)

### Design Characteristics

- Rich hero section with featured content
- VIP badge system
- Language selection prominent
- Detailed metadata (ratings, year, genre, cast)
- "Watch Later" functionality visible
- Multiple content types (Drama, K-Drama, Movie, Anime)

### Color Palette

- Primary: iQIYI green (#00BE06)
- Background: Dark mode (#0f0f0f) with gradients
- VIP accent: Gold/yellow
- Text: White/light gray

### Typography

- Multiple font weights for hierarchy
- Large hero titles
- Small metadata text

### Key Features to Implement

1. Hero banner with featured drama
2. VIP subscription indicators
3. Language flags/badges
4. Rich metadata display
5. "Watch Later" quick action
6. Category tabs with icons

---

## Style 4: Netflix-Inspired (Dark & Immersive)

### Design Characteristics (from research)

- Content-first, immersive design
- Proprietary "Hawkins" Design System
- Full-bleed hero with gradient overlay
- Horizontal scrolling content rows
- Card expansion on hover (famous Netflix effect)
- Minimal UI chrome

### Color Palette

- Netflix Red: #E50914
- Pure Black: #000000 (primary background)
- Dark Gray: #141414 (secondary background)
- Medium Gray: #808080 (muted text)
- Light Gray: #B3B3B3 (body text)
- White: #FFFFFF (primary text)

### Typography

- Netflix Sans (fallback: Helvetica Neue, Helvetica, Arial)
- Hero Title: 48-64px, Bold
- Section Title: 20-24px, Semibold
- Card Title: 14-16px, Medium
- Body: 16px, Regular

### Layout Patterns

```css
/* Fluid margins */
padding: 0 4%;

/* Content rows */
row-gap: 48px;

/* Card grid */
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
gap: 8px;
```

### Interaction Patterns

1. **Card Hover Effect**: Scale up 1.4x with z-index boost, show additional info
2. **Hero Auto-play**: Video preview on hover
3. **Horizontal Scroll**: Mouse wheel + drag navigation
4. **Infinite Scroll**: No pagination, continuous loading
5. **Search**: Full-screen overlay with debounced results

### Key Features to Implement

1. Dark theme as default
2. Horizontal scrolling rows
3. Card expansion animation on hover
4. Full-screen search overlay
5. Hero banner with auto-play preview
6. "More Info" slide-out panel

---

## Style 5: Custom "Modern Glass" Design

### Concept

A modern, premium design combining:

- Glassmorphism effects (translucent cards)
- Gradient accents
- Smooth animations
- Dark mode optimized
- Clean typography

### Design Characteristics

- Glass-like card effects with backdrop blur
- Gradient borders and accents
- Smooth micro-interactions
- Premium feel with purple/pink gradient accents
- Clean layout with generous spacing

### Color Palette

- Background: Deep dark (#0a0a0f) with subtle gradient
- Card: Translucent dark (rgba(255,255,255,0.05)) with backdrop blur
- Primary Gradient: Purple (#8B5CF6) to Pink (#EC4899)
- Accent: Cyan (#06B6D4)
- Text: White (#FFFFFF) with opacity variations

### Typography

- Modern geometric sans-serif (Inter or similar)
- Large display titles with gradient text
- Clean hierarchy with weight variations

### Key Features to Implement

1. Glassmorphism cards with hover lift effect
2. Gradient text accents
3. Smooth page transitions
4. Animated search with blur background
5. Shimmer loading effects
6. Floating action buttons

---

## UX Fixes Required (All Styles)

### 1. Fix Search Debouncing

**Current Problem:**

```tsx
// dramas.index.tsx line 98
onChange={(e) => setSearchTerm(e.target.value)}
```

**Solution:**

```tsx
// Add debounce hook
const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchTerm);
    setPage(1);
  }, 300);
  return () => clearTimeout(timer);
}, [searchTerm]);

// Use debouncedSearch in useDramas
const { data, isLoading, error, isFetching } = useDramas({
  search: debouncedSearch,
  page,
  pageSize: 20,
});
```

### 2. Fix Load More Data Appending

**Current Problem:**

```tsx
// use-drama.ts lines 46-52
return useQuery({
  queryKey: ["dramas", options],
  queryFn: () => fetchDramas(options),
  staleTime: 5 * 60 * 1000,
});
```

**Solution:**

```tsx
// Use infinite query or manual data concatenation
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ["dramas", search],
  queryFn: ({ pageParam = 1 }) =>
    fetchDramas({ search, page: pageParam, pageSize: 20 }),
  getNextPageParam: (lastPage) =>
    lastPage.hasMore ? lastPage.page + 1 : undefined,
});

// Flatten pages for display
const dramas = data?.pages.flatMap((page) => page.items) || [];
```

---

## Technical Implementation Notes

### Tailwind CSS v4 Configuration

All styles should leverage Tailwind v4 features:

- CSS-first configuration via `@theme inline`
- Custom color variables in `:root`
- Dark mode via `.dark` class

### Animation Strategy

- Use `framer-motion` for complex animations (Netflix card expansion)
- CSS transitions for simple hover effects
- `AnimatePresence` for page transitions

### Component Structure

```
src/
  styles/
    themes/
      dramabox-theme.css      # Style 1
      minimal-theme.css       # Style 2
      iqiyi-theme.css         # Style 3
      netflix-theme.css       # Style 4
      glass-theme.css         # Style 5
  components/
    themes/
      dramabox/               # Style 1 components
      minimal/                # Style 2 components
      iqiyi/                  # Style 3 components
      netflix/                # Style 4 components
      glass/                  # Style 5 components
```

### Theme Switching

- Store theme preference in localStorage
- Apply theme class to `<html>` or `<body>`
- Dynamic import of theme CSS files

---

## Research Sources

1. **DramaBoxDB**: https://dramaboxdb.com - Clean modern design with genre tags
2. **DracinKita**: https://dracinkita.com - Minimalist Indonesian drama site
3. **iQ.com**: https://www.iq.com - Rich Asian streaming platform
4. **Netflix**: Research-based analysis (blocks automated browsing)
   - Design System: "Hawkins" internally
   - Color Palette: #E50914 red, #000000/#141414 dark backgrounds
   - Typography: Netflix Sans proprietary font
   - Patterns: Card expansion, horizontal scroll, full-bleed hero

---

## Next Steps

1. Consult Metis for gap analysis
2. Generate complete work plan with all 5 styles
3. Include specific file changes for each style
4. Provide implementation order recommendation
