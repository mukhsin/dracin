# Work Plan: Implement 5-Theme Design System

## Objective

Implement a complete theme switching system with 5 distinct designs: DramaBoxDB, DracinKita, iQ.com, Netflix, and Modern Glass.

## Background

The original plan specified 5 different UI themes, but only one generic dark theme was implemented. This plan adds the complete theme switching infrastructure.

## TODOs

### Phase 1: Create Theme Infrastructure

- [ ] 1. Create contexts directory structure
  - Create `apps/web/src/contexts/` directory

- [ ] 2. Create Theme Context
  - File: `apps/web/src/contexts/theme-context.tsx`
  - Theme type: 'dramabox' | 'dracinkita' | 'iqiyi' | 'netflix' | 'glass'
  - localStorage persistence
  - SSR-safe mounting
  - DEFAULT_THEME: 'dracinkita'

- [ ] 3. Create Theme CSS Variables
  - File: `apps/web/src/styles/themes.css`
  - DramaBoxDB: Black (#000000) + Pink (#ff1493)
  - DracinKita: Slate-900 (#0F172A) + Blue (#3b82f6)
  - iQ.com: Dark (#1a1c22) + Green (#1CC749)
  - Netflix: Black (#000000) + Red (#E50914), card scale 1.4x on hover
  - Glass: Deep purple (#0a0a0f) + Purple-Pink gradient, glassmorphism

- [ ] 4. Create Theme Switcher Component
  - File: `apps/web/src/components/theme-switcher.tsx`
  - Dropdown with 5 theme options
  - Visual previews for each theme
  - Accessible keyboard navigation

### Phase 2: Integrate Theme System

- [ ] 5. Update Root Layout
  - File: `apps/web/src/routes/__root.tsx`
  - Add ThemeProvider wrapper
  - Add FOUC prevention script

- [ ] 6. Update Header
  - File: `apps/web/src/components/header.tsx`
  - Import and add ThemeSwitcher component

- [ ] 7. Update Styles
  - File: `apps/web/src/styles.css`
  - Import themes.css

### Phase 3: Theme-Specific Styling

- [ ] 8. Update DramaCard for Netflix theme
  - Add scale transform on hover (1.4x) for Netflix theme only
  - Use CSS selector: `[data-theme="netflix"] .drama-card:hover`

- [ ] 9. Update Home Page layouts per theme
  - DramaBoxDB: Grid with pagination feel
  - DracinKita: Simple minimal grid
  - iQ.com: Hero carousel style
  - Netflix: Horizontal scrolling rows
  - Glass: Floating glass cards

- [ ] 10. Update Dramas Index page
  - Theme-specific grid layouts
  - Theme-specific card sizes

### Phase 4: Testing

- [ ] 11. Verify theme switching works
  - Switch between all 5 themes
  - Verify localStorage persistence
  - Check no FOUC on refresh

- [ ] 12. Build verification
  - Run `bun run build`
  - Ensure no TypeScript errors
  - Check all imports resolve

## Files to Create

1. `apps/web/src/contexts/theme-context.tsx`
2. `apps/web/src/components/theme-switcher.tsx`
3. `apps/web/src/styles/themes.css`

## Files to Modify

1. `apps/web/src/routes/__root.tsx` - Add ThemeProvider
2. `apps/web/src/components/header.tsx` - Add ThemeSwitcher
3. `apps/web/src/styles.css` - Import themes.css
4. `apps/web/src/components/drama-card.tsx` - Add Netflix hover effect

## Theme Specifications

### DramaBoxDB (Content-first)

- Background: #000000
- Primary: #ff1493 (Deep Pink)
- Features: Episode badges, genre pills, section headers
- Layout: Grid with prominent badges

### DracinKita (Ultra-minimal)

- Background: #0F172A (Slate 900)
- Primary: #3b82f6 (Blue 500)
- Features: Simple episode count badges, clean spacing
- Layout: Minimal grid, no excessive metadata

### iQ.com (Feature-rich)

- Background: #1a1c22
- Primary: #1CC749 (iQIYI Green)
- Features: VIP badges, TOP rankings, hero carousel
- Layout: Horizontal scroll rows, rich metadata

### Netflix (Immersive)

- Background: #000000 (Pure Black)
- Primary: #E50914 (Netflix Red)
- Features: Card expansion 1.4x on hover, horizontal rows
- Layout: Full-bleed hero, 4% margins, hidden scrollbars

### Modern Glass (Premium)

- Background: #0a0a0f (Near Black)
- Primary: Linear gradient 135deg #8B5CF6 to #EC4899
- Features: Glassmorphism (backdrop-filter: blur), shimmer effects
- Layout: Floating cards with blur backgrounds

## Verification Commands

```bash
# Type checking
bun run typecheck

# Build verification
bun run build

# Dev server test
bun run dev
```

## Success Criteria

- [ ] All 5 themes render without errors
- [ ] Theme switcher dropdown works in header
- [ ] Selected theme persists in localStorage
- [ ] No FOUC (flash of wrong theme) on page load
- [ ] Netflix theme shows card expansion on hover
- [ ] Glass theme shows backdrop-filter blur effects
- [ ] Build passes without errors
