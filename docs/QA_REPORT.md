# Final QA report

Date: 2026-07-12

## Automated results

- TypeScript: passed
- Vitest: 52 tests passed across 3 files
- Oxlint: passed with no warnings
- Production PWA build: passed
- Playwright: 16 tests passed across desktop Chromium and iPhone 13 WebKit profiles
- Accessibility: onboarding, Today, and active workout pass automated WCAG A/AA checks
- Offline production test: passed
- npm audit: 0 vulnerabilities reported at install time

## Verified critical behavior

- Exactly 90 continuous program days resolve to valid templates.
- Phase boundaries map to Days 1–14, 15–35, 36–63, 64–84, and 85–90.
- Day 1 uses a conservative assessment; Day 90 repeats the recorded setup; Day 91 begins a history-preserving continuation cycle.
- Pain takes precedence over all energy, soreness, and time combinations.
- Significant soreness produces a structured ten-minute mobility session.
- Low energy and mild soreness reduce working volume.
- Every recovery template contains five named mobility blocks totaling exactly 600 active seconds.
- Mobility blocks capture a simple comfortable/limited-today signal and report it separately from strength PRs.
- Safely completed days require 600 active seconds; elapsed reading and logging time cannot satisfy the gate.
- Strength work completed early enters a persisted mobility-finisher countdown for the exact remainder.
- A 599-second practice remains incomplete across refresh; 600 seconds enables completion.
- Safety stops persist neutrally, create no make-up work, and are excluded from the consistency denominator.
- Calendar intensity is capped until enough symptom-free, multi-pattern strength practices are logged.
- Regular exercise trends compare only matching exercise, metric, load, variation, and tempo.
- Timed unilateral movements use a two-side total timer while logging the weaker side’s result.
- The saved habit anchor appears on Today and can generate an optional recurring iPhone Calendar cue.
- Every workout template resolves to a no-dumbbell queue without loaded equipment requirements.
- Switching to a travel session preserves a separate draft and restores the normal loaded queue when dumbbells return.
- Older backups without the daily dumbbell flag import with a safe backward-compatible default.
- Top-of-range performance with 2+ RIR selects the next available weight.
- Discomfort, failure, or a missed lower target prevents progression.
- Local date calculation survives daylight-saving boundaries; the formal challenge caps at Day 90 while ongoing program days continue.
- Valid backups round-trip; malformed and unsupported imports are rejected.
- The critical onboarding → Day 1 → completion → refresh flow persists history.
- An iPhone-sized viewport has no horizontal overflow on the safety path.
- Production build emits a manifest, service worker, and offline precache.
- GitHub Pages deployment succeeded at `https://afinoblakeb.github.io/ten-strong/`.
- The live origin passed Chromium offline reload and WebKit mobile-width, service-worker, and precache checks.

## Visual inspection

Inspected the onboarding, Today, and active workout screens at 390 × 844. Typography, contrast, spacing, touch controls, mobile safe areas, exercise visuals, target hierarchy, and primary action visibility were reviewed from actual WebKit renders. Screenshots are stored under `docs/screenshots/`.

## Remaining manual checks before a public release

- Confirm Add to Home Screen icon and standalone launch on a physical iPhone.
- Confirm an offline relaunch on that physical device after the first successful load.
- Run VoiceOver on a physical device through one entire workout.
- Exercise the JSON export/import flow with a real downloaded file in iOS Safari.

These require the destination repository URL or physical device and are not production-build failures.
