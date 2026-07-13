# Changelog

## 1.4.1 — 2026-07-13

- Added read-only previews for every challenge day from the Calendar and Plan
- Added previous/next day browsing with the scheduled focus, movements, targets,
  phase effort, equipment, and actual challenge date
- Kept future sessions locked so looking ahead cannot create logs, drafts, or alter
  adaptive progression; the exact prescription still responds to readiness and
  dumbbell availability on the day

## 1.4.0 — 2026-07-13

Full usability overhaul driven by a 122-finding audit of the live app.

- Progression engine rewritten: honest in-range work never scores as failure, rep
  targets walk the full range before load jumps, returning from bodyweight starts at
  the lightest dumbbell (never the heaviest), loads only attach to dumbbell movements,
  and phase-appropriate effort (1–2 reps in reserve) still progresses
- Missed Day-1 baselines and Day-90 finals get makeup windows; mobility days now run
  their actual planned templates and rotate for variety; day 8/9 duplicate removed
- Storage can no longer destroy history: corrupt data is quarantined and leniently
  recovered instead of silently overwritten; drafts are cleaned on reset; backups
  stamp their date and Today nudges when one is overdue
- Workout runner: audible chime + vibration + screen pulse when rest ends, holds end,
  sides switch, and the day completes (toggle in Settings); undo last set; rest
  between completed sets counts toward the ten active minutes; the wind-down is a
  short victory lap instead of a six-minute lecture; drafts reconcile across
  readiness changes; pause pauses everything; midnight-crossing workouts keep their day
- Today: start button above the fold, one notice at a time, readiness sheet remembers
  answers and skips questions that don't apply, resume affordance for interrupted
  workouts, streak-first stats that never punish an unlogged morning
- Onboarding: forgiving dumbbell input with tap-to-add chips, start-today default,
  required real body stats instead of fabricated defaults
- Calendar legend and truthful day coloring; computed protein guidance from logged
  body weight; searchable grouped exercise library; in-app confirmations replace
  window.confirm; library/plan copy trimmed
- Manrope is actually bundled and precached (numerals no longer fall back to serif);
  cream iOS theme color; opaque home-screen icons; service-worker update check on
  app resume; safe-area handling; accessible dialogs, radio groups, and timers

## 1.3.0 — 2026-07-12

- Removed the generic stick-figure exercise drawings from the workout runner and library
- Added a unique written guide for every movement: setup, ordered motion, breathing, expected sensation, and stop guidance
- Added plain-language explanations for every prescribed tempo
- Added automated coverage that rejects missing or duplicated movement sequences and verifies the visual-free workout flow on mobile WebKit and desktop Chromium

## 1.2.0 — 2026-07-12

- Made 600 active seconds a hard requirement for every safely completed day
- Replaced generic recovery with three structured ten-minute mobility sessions
- Added a guided mobility remainder when strength work finishes before ten active minutes
- Added daily and weekly habit-cue reinforcement plus an optional iPhone calendar cue
- Capped training intensity by qualified completed exposure rather than calendar phase alone
- Made progress comparisons load-, variation-, metric-, and tempo-aware
- Added persisted safety stops and a history-preserving Day 91+ continuation rhythm
- Simplified in-workout logging while preserving optional detailed controls

## 1.1.0 — 2026-07-12

- Added an explicit daily dumbbell availability check
- Added movement-matched, zero-equipment bodyweight queues for every workout
- Isolated travel workout drafts and progressions from normal loaded sessions
- Added backward-compatible readiness persistence and mobile browser coverage

## 1.0.0 — 2026-07-12

- Initial complete Ten Strong release
- Five-phase 90-day home strength program
- Readiness, progression, missed-day, and five-minute fallback logic
- Onboarding, Today, workout runner, calendar, progress, plan, exercise library, recovery, methodology, and settings screens
- Local persistence, JSON backup/restore, CSV summary, print mode, and reset
- Installable offline PWA and GitHub Pages workflow
- Unit, mobile WebKit, and desktop Chromium test coverage
