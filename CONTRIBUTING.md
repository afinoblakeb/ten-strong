# Contributing

Thanks for improving Ten Strong.

## Development

```bash
npm ci
npm run dev
```

Before opening a pull request:

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

## Content changes

Keep exercise and program content in `src/data/`, never in page components. Keep recommendation rules pure and explainable in `src/lib/engine.ts`. Any rule change must include a test showing both the qualifying case and the safety or regression veto.

Training content should remain conservative for the first two weeks, use calm non-shaming language, avoid medical claims, and cite primary research, systematic reviews, consensus statements, or recognized professional organizations.

## Product principles

- Ten minutes still means ten minutes.
- Pain and movement quality outrank progression.
- Missed sessions never create punishment volume.
- The same rule must generate the recommendation and its explanation.
- Personal data stays local by default.
- Mobile, keyboard, and reduced-motion use are first-class paths.

## Commit and pull request notes

Keep changes focused. Explain the user-facing effect, tests run, evidence for training-content changes, and any migration required for persisted data.
