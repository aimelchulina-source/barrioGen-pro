# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server at localhost:5173 (or next free port)
npm run build      # tsc type-check + vite production build
npm run lint       # oxlint static analysis
npm run preview    # serve the production build locally
```

There are no tests. `npm run build` is the fastest way to catch type errors — run it before committing.

## Git workflow

After every meaningful change: commit with a conventional prefix (`feat:`, `fix:`, `refactor:`, `style:`, `chore:`) and push to `origin/main`.

```bash
git add <files>
git commit -m "fix: description"
git push
```

Remote: `https://github.com/aimelchulina-source/barrioGen-pro`

## Architecture

The app is a single-page civil engineering planner. There is no backend, no router, and no test suite. All state lives in React (`App.tsx`) and persists to `localStorage` via `src/lib/storage.ts`.

### Data flow

```
User input (coords / sliders)
  → App.tsx state (activeProject: Project)
    → generatePlan() in planGenerator.ts   ← pure function, called on every param change
      → GeneratedPlan { lots, roads, amenityZones, stats }
        → MapView.tsx (renders to Leaflet layers)
        → StatsPanel.tsx (renders numbers)
```

`generatePlan` is the core of the app. It is a pure function with no side effects.

### Coordinate system in planGenerator.ts

All grid geometry is computed in **local metric XY space** (east-metres, north-metres), projected from lat/lng using an equirectangular projection corrected for latitude:

```
x = (lng - originLng) × cos(lat) × 111320
y = (lat - originLat) × 111320
```

This is necessary because `1° lat ≠ 1° lng` in real-world metres at Argentine latitudes (~−34°). Working in metres makes lot widths/depths exact and rotation correct. Turf.js is used only for geodetic operations (`buffer`, `intersect`, `area`, `length`) where its spherical math matters; all grid placement logic uses the local XY functions.

### Plan generation algorithm (`src/lib/planGenerator.ts`)

1. Erode the input polygon by `setback` metres (Turf buffer, negative) → **buildable**
2. Erode buildable by `boulevardWidth` → **inner** (where lots and secondary roads go)
3. Convert inner polygon's outer ring to XY and find the **dominant edge angle** (longest edge, computed in metres so the angle is geometrically correct)
4. Rotate the inner XY ring by `−angle` → **axis-aligned** space; compute its bounding box
5. Generate a regular rectangular grid of road bands and lot cells in the axis-aligned bounding box (all dimensions in metres)
6. For each cell: fast 2-D point-in-polygon check against the axis-aligned inner ring and amenity exclusion rings
7. Un-rotate by `+angle` → back to metric XY → project to lat/lng; clip each lot to `innerGeo` with `turf.intersect` so boundary lots never bleed outside
8. Render the boulevard as `turf.difference(buildable, inner)`

### Key types (`src/types.ts`)

- `DesignParams` — all user-controlled parameters (road widths, lot sizes, amenity toggles, `lagunaConfig`)
- `Project` — persisted unit: name + coordinates + params + timestamps
- `GeneratedPlan` — ephemeral output of `generatePlan`; never persisted
- `LotFeature.coords` is `LatLng[][]` (array of rings, like GeoJSON) to support clipped boundary lots that may become multi-part polygons after `turf.intersect`

### Styling

No Tailwind utility classes are used in JSX. All styling is inline `style={{}}` with CSS custom properties defined in `src/index.css`:

```
--bg, --surface, --surface2, --border
--accent (#e8c84a gold), --green, --blue, --purple
--text, --muted
```

Tailwind v4 is wired via `@tailwindcss/vite` plugin (not PostCSS). The `@import "tailwindcss"` in `index.css` must come after any `@import url(...)` Google Fonts lines or the build emits a CSS ordering warning.

### TypeScript constraints

`tsconfig.app.json` sets `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax: true`. The last rule means type-only imports must use `import type`. Turf v7 does not re-export GeoJSON types (`Feature`, `Polygon`, etc.) — import them from `"geojson"` directly, never as `turf.Feature<...>`.

### Leaflet in React

`MapView.tsx` manages the Leaflet map imperatively via refs. The map is initialised once in a `useEffect` with an empty dependency array. Plan layers are cleared and re-drawn in a second `useEffect` that depends on `[coordinates, plan, showLotNumbers, showDimensions]`. Never call Leaflet APIs outside of `useEffect`.
