# 0002 — Curated animal pool and per-level selection

- Date: 2026-10-23
- Status: accepted (explicit project-owner request)
- Supersedes: the fixed 36-animal selection in
  `0001-vuetify-presentation.md`; the presentation stack is unchanged.

## Decision

Maintain a candidate pool of whole-animal artwork available in all four
independent libraries: Microsoft Fluent Emoji, Noto Color Emoji, Twemoji, and
OpenMoji. Keep five selectable themes because Fluent 3D and Fluent Animated
are variants of the same library. When the animated library lacks an animal,
bundle the pinned Fluent 3D image as its static fallback.

Exclude head-only drawings, obvious pests such as cockroaches, mosquitoes,
flies, and ants, and visually confusable variants such as the single-hump
camel. Retain butterflies, honeybees, lady beetles, beetles, caterpillars,
and snails, as explicitly requested. The inventory and representative choices
are recorded in `../ANIMAL_SELECTION.md`.

Each level selects 36 distinct candidates without replacement using the
session's seeded RNG. Deal four copies of each selected kind on the existing
16-by-9 board. Select again on a new level or restart. Shuffle, hint, pause,
and theme changes preserve the level's selected kinds.

Chance-kind rerolls use the 36 selected kinds for that level, including kinds
already removed from the board. They never choose an unsampled candidate.

## Evidence boundary

The original game has a fixed 36-kind multiset, as documented in
`../../re/RULESET.md`. Expanding and sampling the candidate pool is a deliberate
web adaptation, not a new claim about the original executable. Matching,
per-kind multiplicity, board dimensions, scoring, timers, level transforms,
and resource rules retain their existing contracts.

## Verification

Verify the four-library artwork intersection visually; record immutable
source paths and hashes for every bundled file. Unit tests cover selection
size and uniqueness, four copies per kind, candidate-pool preservation,
seed replay, resampling at level/restart boundaries, and chance-kind scope.
Browser checks cover every theme, the full candidate preview, level selection,
theme-switch preservation, and desktop/narrow board fit.
