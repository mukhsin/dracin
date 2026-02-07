# Episode Grid Layout Plan

## TL;DR

> Transform the drama details page episode list from a boring vertical scroll to a compact grid: **5 columns on mobile**, **10 columns on desktop**. Each cell shows just the episode number with hover effects for quick scanning.

**Deliverables**:

- Updated `EpisodeCard` component - compact square design
- Responsive grid layout in episode list section
- Visual hover/active states for better UX
- No layout breakage on various episode counts

**Estimated Effort**: Quick (~15 min)
**Parallel Execution**: NO - single task

---

## Context

### Original Request

User wants to change the episode list on the drama details page from a vertical scrolling list to a compact grid layout. Requirements:

- Mobile: 5 columns
- Desktop: 10 columns
- Less boring, easier to scroll through many episodes

### Current Implementation

**File**: `/Users/mukhsin/Code/sandbox/bun-dracin/apps/web/src/routes/dramas.$dramaId.tsx`

Current `EpisodeCard` (lines 11-49):

- Full horizontal card with: episode number badge, title, description (2 lines), duration with icon, play button
- Each card is ~100px+ tall
- Vertical `grid gap-3` layout (essentially single column)
- Lots of whitespace, requires heavy scrolling for dramas with 50+ episodes

Current grid container (lines 253-258):

```tsx
<div className="grid gap-3">
  {episodes.map((episode) => (
    <EpisodeCard key={episode.id} episode={episode} />
  ))}
</div>
```

### Technical Stack

- TanStack Start with React 19
- Tailwind CSS v4 (`@import "tailwindcss"` pattern)
- Standard breakpoints: `sm`, `md`, `lg`, `xl`
- Grid classes support arbitrary values: `grid-cols-5`, `grid-cols-10`

---

## Work Objectives

### Core Objective

Replace the vertical episode list with a compact responsive grid that displays episode numbers in a dense layout: 5 columns on mobile (<768px) and 10 columns on desktop (≥1024px).

### Concrete Deliverables

- Refactored `EpisodeCard` component: compact square cell design
- Responsive grid container with proper gap sizing
- Visual states: hover, active, focus-visible
- Empty state preserved (no episodes message)

### Definition of Done

- [x] Episode list displays as grid with 5 columns on mobile
- [x] Episode list displays as grid with 10 columns on desktop
- [x] Each cell shows episode number clearly
- [x] Clicking cell navigates to episode watch page
- [x] Visual feedback on hover/active states
- [x] Empty state works correctly when no episodes

### Must Have

- Episode numbers clearly visible in compact cells
- Responsive grid breakpoints working correctly
- Navigation to watch page on click
- Keyboard accessibility (focus states)

### Must NOT Have (Guardrails)

- DO NOT change the hero section (poster, title, description)
- DO NOT change the "Play First Episode" button behavior
- DO NOT remove the episode title/description from the UI entirely (can show on hover if desired)
- DO NOT add new dependencies

---

## Gap Analysis & Self-Review

**Auto-Resolved** (minor gaps fixed):

- Gap: Episode descriptions won't fit in compact cells
  - Resolution: Remove description from grid cells, show only episode number
- Gap: How to indicate currently selected episode
  - Resolution: Not in scope - drama details page doesn't track "current" episode
- Gap: Gap sizing between cells
  - Resolution: Use `gap-2` (8px) for tight but readable spacing

**Defaults Applied** (override if needed):

- Mobile breakpoint: <640px gets 5 columns
- Desktop breakpoint: ≥1024px gets 10 columns
- Tablet (640px-1023px): 5-8 columns with auto-fit

**Decisions Needed**: None - all requirements clear

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (Playwright E2E tests exist)
- **Automated tests**: NO (E2E verification via Playwright agent)
- **Framework**: N/A for this UI-only change

### Agent-Executed QA Scenarios (MANDATORY)

**Scenario 1: Mobile Grid Layout (5 columns)**
Tool: Playwright (playwright skill)
Preconditions: Dev server running on localhost:3000, drama with 10+ episodes exists
Steps:

1. Navigate to: http://localhost:3000/dramas/{dramaId} (use first drama from API)
2. Set viewport: 375px width (iPhone SE)
3. Wait for: .episode-grid container visible (timeout: 5s)
4. Count: Number of episode cells in first row
5. Assert: Episode cells in first row equals 5
6. Assert: Episode cell width is approximately 20% of container (375px / 5 = ~75px per cell minus gap)
7. Assert: Episode numbers visible in cells (1, 2, 3, 4, 5...)
8. Screenshot: .sisyphus/evidence/episode-grid-mobile-5cols.png
   Expected Result: 5 episode cells visible per row on mobile viewport
   Evidence: .sisyphus/evidence/episode-grid-mobile-5cols.png

**Scenario 2: Desktop Grid Layout (10 columns)**
Tool: Playwright (playwright skill)
Preconditions: Dev server running, drama with 20+ episodes exists
Steps:

1. Navigate to: http://localhost:3000/dramas/{dramaId}
2. Set viewport: 1440px width (desktop)
3. Wait for: .episode-grid container visible (timeout: 5s)
4. Count: Number of episode cells in first row
5. Assert: Episode cells in first row equals 10
6. Assert: Episode cell width is approximately 10% of container
7. Assert: Episode numbers visible in cells
8. Screenshot: .sisyphus/evidence/episode-grid-desktop-10cols.png
   Expected Result: 10 episode cells visible per row on desktop viewport
   Evidence: .sisyphus/evidence/episode-grid-desktop-10cols.png

**Scenario 3: Episode Navigation Works**
Tool: Playwright (playwright skill)
Preconditions: Dev server running, drama with episodes
Steps:

1. Navigate to: http://localhost:3000/dramas/{dramaId}
2. Wait for: .episode-cell with text "1" visible (timeout: 5s)
3. Click: First episode cell (episode 1)
4. Wait for: URL changes to /watch/{episodeId} (timeout: 5s)
5. Assert: URL contains "/watch/"
6. Assert: Video player container visible
7. Screenshot: .sisyphus/evidence/episode-grid-navigation.png
   Expected Result: Clicking episode cell navigates to watch page
   Evidence: .sisyphus/evidence/episode-grid-navigation.png

**Scenario 4: Hover States Visual Feedback**
Tool: Playwright (playwright skill)
Preconditions: Dev server running, drama with episodes
Steps:

1. Navigate to: http://localhost:3000/dramas/{dramaId}
2. Wait for: .episode-cell visible (timeout: 5s)
3. Hover: First episode cell
4. Wait: 500ms for transition
5. Assert: Cell has hover styling (background-color changed or border-color changed)
6. Take element screenshot: First episode cell
7. Screenshot: .sisyphus/evidence/episode-grid-hover-state.png
   Expected Result: Visual feedback on hover (color change, scale, or border)
   Evidence: .sisyphus/evidence/episode-grid-hover-state.png

**Scenario 5: Empty State Handling**
Tool: Playwright (playwright skill)
Preconditions: Dev server running
Steps:

1. Navigate to: http://localhost:3000/dramas/{dramaId-with-no-episodes} OR mock empty state
2. Wait for: page load (timeout: 5s)
3. Assert: Empty state message visible ("No episodes available yet")
4. Assert: Film icon visible in empty state
5. Screenshot: .sisyphus/evidence/episode-grid-empty-state.png
   Expected Result: Empty state displays correctly when drama has no episodes
   Evidence: .sisyphus/evidence/episode-grid-empty-state.png

---

## TODOs

- [x] 1. Refactor Episode List to Compact Grid

  **What to do**:
  - Refactor `EpisodeCard` component to compact square design:
    - Replace horizontal layout with simple centered episode number
    - Keep Link wrapper for navigation
    - Add aspect-square for consistent sizing
    - Style: bg-card, border, rounded-lg, hover effects
  - Update episodes grid container:
    - Change from `grid gap-3` to responsive grid
    - Mobile: `grid-cols-5`
    - Desktop (lg+): `grid-cols-10`
    - Use `gap-2` for tighter spacing
  - Preserve empty state:
    - Keep existing "No episodes available" message
  - Ensure accessibility:
    - Keep focus-visible outline styles (already in global CSS)
    - Episode cells should be keyboard navigable

  **Must NOT do**:
  - DO NOT modify hero section (poster, title, description)
  - DO NOT change "Play First Episode" button
  - DO NOT add new dependencies
  - DO NOT break existing navigation logic
  - DO NOT remove empty state handling

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Pure frontend UI/UX task requiring visual precision
  - **Skills**: [`tailwind-v4-shadcn`, `frontend-ui-ux`]
    - `tailwind-v4-shadcn`: Tailwind v4 grid and responsive utilities
    - `frontend-ui-ux`: Visual polish and interaction design

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: N/A
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):
  **Pattern References** (existing code to follow):
  - `apps/web/src/routes/dramas.$dramaId.tsx:11-49` - Current EpisodeCard implementation (to transform)
  - `apps/web/src/routes/dramas.$dramaId.tsx:253-258` - Current grid container
  - `apps/web/src/styles.css:74-99` - Scrollbar and focus styles to maintain

  **Styling References** (theme variables):
  - `apps/web/src/styles.css:6-25` - CSS variables: background, card, primary, border, etc.
  - `apps/web/src/styles.css:28-51` - @theme inline mapping

  **WHY Each Reference Matters**:
  - `dramas.$dramaId.tsx:11-49`: Current EpisodeCard implementation - transform this into compact grid cell
  - `dramas.$dramaId.tsx:253-258`: Grid container location - change `grid gap-3` to responsive grid
  - `styles.css:6-25`: Use existing theme variables for consistent styling (bg-card, border, primary)

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios (MANDATORY - all must pass):**

  **Scenario A: Mobile 5-Column Layout**
  - [ ] Run dev server: `bun run dev`
  - [ ] Use Playwright to navigate to drama details page
  - [ ] Set viewport to 375px width
  - [ ] Verify: 5 episode cells per row
  - [ ] Screenshot: `.sisyphus/evidence/task-1-mobile-grid.png`

  **Scenario B: Desktop 10-Column Layout**
  - [ ] Set viewport to 1440px width
  - [ ] Verify: 10 episode cells per row
  - [ ] Screenshot: `.sisyphus/evidence/task-1-desktop-grid.png`

  **Scenario C: Navigation Works**
  - [ ] Click episode cell
  - [ ] Verify: Navigates to /watch/{episodeId}
  - [ ] Screenshot: `.sisyphus/evidence/task-1-navigation.png`

  **Scenario D: Hover States**
  - [ ] Hover over episode cell
  - [ ] Verify: Visual feedback (color change, scale, or border)
  - [ ] Screenshot: `.sisyphus/evidence/task-1-hover-state.png`

  **Evidence to Capture**:
  - [ ] `.sisyphus/evidence/task-1-mobile-grid.png`
  - [ ] `.sisyphus/evidence/task-1-desktop-grid.png`
  - [ ] `.sisyphus/evidence/task-1-navigation.png`
  - [ ] `.sisyphus/evidence/task-1-hover-state.png`

  **Commit**: YES
  - Message: `style(drama-details): convert episode list to compact grid`
  - Files: `apps/web/src/routes/dramas.$dramaId.tsx`

---

## Commit Strategy

| After Task | Message                                                      | Files                                     | Verification         |
| ---------- | ------------------------------------------------------------ | ----------------------------------------- | -------------------- |
| 1          | `style(drama-details): convert episode list to compact grid` | `apps/web/src/routes/dramas.$dramaId.tsx` | Playwright QA passes |

---

## Success Criteria

### Verification Commands

```bash
# Start dev server
bun run dev

# E2E test (optional if user has playwright)
cd apps/web && bunx playwright test e2e/drama-details.spec.ts
```

### Final Checklist

- [x] Episode grid displays 5 columns on mobile (<640px)
- [x] Episode grid displays 10 columns on desktop (≥1024px)
- [x] Each cell shows episode number clearly
- [x] Clicking cell navigates to watch page
- [x] Hover states provide visual feedback
- [x] Empty state displays correctly
- [x] No console errors
- [x] All existing functionality preserved

---

## Implementation Notes

### Suggested Code Changes

**EpisodeCard transformation** (lines 11-49):

```tsx
function EpisodeCard({ episode }: { episode: any }) {
  return (
    <Link
      to={`/watch/${episode.id}`}
      className="group bg-card rounded-lg border aspect-square flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all"
    >
      <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
        {episode.number}
      </span>
    </Link>
  );
}
```

**Grid container** (lines 253-258):

```tsx
<div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
  {episodes.map((episode) => (
    <EpisodeCard key={episode.id} episode={episode} />
  ))}
</div>
```

### Visual Design Guidelines

- **Cell size**: `aspect-square` ensures consistent square cells
- **Gap**: `gap-2` (8px) provides tight but readable spacing
- **Border**: Default border, changes to primary color on hover
- **Background**: `bg-card` matches theme, adds `primary/5` on hover
- **Text**: Episode number centered, muted-foreground color, primary on hover
- **Focus**: Already handled by global `:focus-visible` style in styles.css

---

_Plan generated by Prometheus. Ready for execution with `/start-work`_
