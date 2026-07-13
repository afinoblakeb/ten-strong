# Architecture notes

## System shape

Ten Strong is a static, local-first React application. Immutable program content is bundled at build time; mutable personal data stays in browser storage.

```text
Editable program config
  exercises.ts + program.ts
          │
          ▼
Pure domain rules ───────► Recommendation + explanation
  date + readiness + progression
          │
          ▼
React routes and workout runner
          │
          ▼
Versioned AppData ───────► localStorage / JSON / CSV / print
```

## Routing

The application uses `HashRouter`. GitHub Pages cannot provide an SPA rewrite for arbitrary nested paths, while hash fragments are handled entirely in the browser. This makes direct links and refreshes reliable under both root hosting and `/repository-name/` subpaths.

## Content model

`src/data/program.ts` defines phases and reusable workout templates, then deterministically expands those structures into exactly 90 `ProgramDay` records. Explicit overrides handle Day 1, Day 89, and Day 90. Tests assert continuous numbering, valid references, and phase boundaries.

Each exercise carries its own coaching metadata. UI components resolve an exercise by ID; they do not hardcode form cues or substitutions.

## Recommendation engine

`src/lib/engine.ts` contains pure functions and uses this precedence:

1. Pain safety override
2. Significant soreness or planned recovery
3. Five-minute fallback
4. Low energy or mild soreness
5. Planned workout

Exercise progression returns an action, next target, and plain-language explanation from the same result object. This prevents the UI explanation from drifting away from the actual rule.

## Dates

Challenge dates are stored as local `YYYY-MM-DD` strings. They are parsed into `new Date(year, monthIndex, day)` rather than through UTC. Calendar differences normalize components through `Date.UTC` only after reading the local date parts, preventing offset and daylight-saving transitions from shifting challenge days.

## State and persistence

`AppStateProvider` owns the versioned `AppData` object and writes it to `localStorage` after meaningful state changes. Imports are parsed with JSON, validated with Zod, and only then replace current state. Session IDs make completion additions idempotent.

The active workout writes a small draft after each logged set. Refreshing the same workout restores the completed set list and queue position. A finished session removes the draft.

## Offline and installation

`vite-plugin-pwa` generates a web manifest and Workbox service worker. The build precaches the HTML shell, compiled code, CSS, icons, and bundled program content. No workout screen depends on a runtime API or external font.

## Accessibility

- Semantic headings, fieldsets, labels, landmarks, and navigation
- Visible focus styles and keyboard-operable controls
- 44 px or larger primary touch targets
- Text labels and symbols in addition to calendar color
- Text/table equivalents for progress chart data
- Timer status is visible and controls do not depend on sound
- Reduced-motion media query
- Mobile safe-area padding for fixed controls

## Security and privacy

- No authentication, backend, analytics, ad scripts, or runtime content fetches
- No progress-photo storage; the preference is only a reminder flag
- No raw HTML rendering of user content
- Import size cap and strict schema validation
- Browser-native file downloads; no upload target
- Service worker caches application assets, not personal exports

## Major tradeoffs

`localStorage` was chosen over IndexedDB because the data is small, the structure is simple, and synchronous validation makes backup/restore easier. The tradeoff is no built-in cross-tab conflict management and a smaller storage ceiling.

The progress visualization uses native HTML and CSS bars plus a screen-reader table. This avoids a large charting dependency while preserving an honest view of actual session minutes.
