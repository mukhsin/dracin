# Work Plan: Fix Video Player + Mobile-First Design

## Objective

Fix the broken video player, implement mobile-first design for vertical videos, use the provided test URL, and integrate with 5-theme system.

## Context

- Current video player is not working
- Videos are VERTICAL (mobile-optimized)
- Need mobile-first responsive design
- Test URL provided for immediate testing
- Must work with 5-theme system

## Test Video URL

```
https://hwztvideo.dramaboxdb.com/16/7x4/74x3/743x4/74340000024/700298461_2/700298461.1080p.wz.g264.mp4?Expires=1770494400&Signature=j3ifXEyvOzAyyh3FkzULYnB2EdJAGKJN5lEBVUcdKZ74T4fmxf8AtS~r6XmfvRPSvw2o4GE-U6nZDZu9C9GtPbpjICOlmStaw~ONIWWOR5p3LoJEZ5yTIpFkkCvvEWMjAcUxzksjz7vMxxL-jcAs2G-NotmdyN8VyxesRWkOtFIHxbKFbbXQmQfxdUAU2ji1sF77ogthKBeRtR2XBWtv7uoiFNtjbfQNkEfH59bemqkLtPQMB4~15AaRlMWVC4JZPBu3495rZx6vvsvBr6d1ign1v7Dm-U2YVtGqpYfRo-Dc5oB59rbuRqr0wTY4zE5ZTZpHvs4GhmerCA1xmWKnvg__&Key-Pair-Id=K3HA2T9LE2QH99V
```

## TODOs

### Phase 1: Fix Basic Player

- [x] 1. Update Video Player Component
  - File: `apps/web/src/components/video-player.tsx`
  - Fix any broken logic or missing dependencies
  - Ensure video element loads properly
  - Add error handling for failed loads

- [x] 2. Add Test URL Support
  - Hardcode test URL for development
  - Support both horizontal and vertical aspect ratios
  - Auto-detect video orientation

- [x] 3. Fix Video Controls
  - File: `apps/web/src/components/video-controls.tsx`
  - Ensure play/pause works
  - Fix seek/progress bar
  - Fix volume control
  - Add fullscreen toggle

### Phase 2: Mobile-First Vertical Design

- [x] 4. Update Video Player Layout
  - Mobile: Full width, 9:16 or taller aspect ratio for vertical videos
  - Desktop: Centered, max-width constraint but maintain vertical ratio
  - Use `aspect-ratio: 9/16` or auto-detect from video

- [x] 5. Update Watch Page Layout
  - File: `apps/web/src/routes/watch.$episodeId.tsx`
  - Mobile-first: Video takes full screen width
  - Vertical stacking: Video → Info → Episodes
  - Touch-friendly controls (bigger buttons)

- [x] 6. Optimize Touch Controls
  - Bigger tap targets (min 44px)
  - Swipe gestures for seek
  - Double-tap to skip forward/backward
  - Pinch to zoom (optional)

### Phase 3: Theme Integration

- [x] 7. Theme-Aware Video Player
  - DramaBoxDB: Pink accent on controls
  - DracinKita: Blue accent, minimal controls
  - iQ.com: Green accent, VIP-style premium look
  - Netflix: Red accent, big controls, immersive
  - Glass: Glassmorphism control bar, blur effects

- [x] 8. Update Theme CSS for Video Player
  - File: `apps/web/src/styles/themes.css`
  - Add player-specific CSS variables
  - Theme-aware control colors
  - Theme-aware progress bar colors

### Phase 4: Testing

- [x] 9. Mobile Testing
  - Test on mobile viewport (375px width)
  - Test touch controls
  - Test vertical video display

- [x] 10. Desktop Testing
  - Test responsive scaling
  - Test mouse controls
  - Test fullscreen

- [x] 11. Theme Testing
  - Test player in all 5 themes
  - Verify control colors change

## Implementation Details

### Video Player Mobile Layout

```tsx
// Mobile: Full width, vertical video
<div className="w-full aspect-[9/16] max-h-[80vh] mx-auto">
  <video ... />
</div>

// Desktop: Centered, constrained width
<div className="w-full max-w-md mx-auto aspect-[9/16] max-h-[80vh]">
  <video ... />
</div>
```

### Touch Control Sizes

- Play button: 64px minimum
- Seek bar: 48px height
- Volume: 48px tap target
- Fullscreen: 44px minimum

### Theme Color Variables

```css
[data-theme="netflix"] {
  --player-accent: #e50914;
  --player-bg: rgba(0, 0, 0, 0.9);
}

[data-theme="glass"] {
  --player-accent: linear-gradient(135deg, #8b5cf6, #ec4899);
  --player-bg: rgba(0, 0, 0, 0.5);
  --player-blur: blur(20px);
}
```

## Files to Modify

1. `apps/web/src/components/video-player.tsx` - Core player logic
2. `apps/web/src/components/video-controls.tsx` - Control UI
3. `apps/web/src/routes/watch.$episodeId.tsx` - Page layout
4. `apps/web/src/styles/themes.css` - Theme colors

## Test Steps

1. Navigate to `/watch/123` (any episode ID)
2. Video should load with test URL
3. Controls should work (play, pause, seek)
4. Should display in vertical 9:16 ratio
5. Should be touch-friendly on mobile
6. Switch themes - controls should change color

## Verification

```bash
# Build
bun run build --filter=@repo/web

# Test dev
bun run dev
# Open http://localhost:3000/watch/test
```

## Success Criteria

- [x] Video loads and plays with test URL
- [x] Vertical videos display correctly (9:16 ratio)
- [x] Mobile layout is optimized (full width, big controls)
- [x] Desktop layout centers the video
- [x] Play/pause works
- [x] Seek bar works
- [x] All 5 themes apply to player controls
- [x] Build passes
