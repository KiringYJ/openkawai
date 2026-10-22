# Roadmap

## M0 — Bootstrap (current)

- [x] Vite + TypeScript, no UI framework.
- [x] Pure board, two-turn pathfinding, seeded RNG.
- [x] Round state, timer, combo scoring, hint, shuffle, pause.
- [x] Responsive shell with an asset-free placeholder tile set.
- [x] Unit tests for core rules and round transitions.
- [x] `re/` evidence workspace and clean-room policy.

## M1 — Evidence capture

- [ ] Record the original build hash and a lawful local input route.
- [ ] Inventory the executable's static resources and runtime files.
- [ ] Confirm board dimensions, number of tile kinds, and layout variants.
- [ ] Record exact matching rules, including border and corner cases.
- [ ] Record timer, scoring, combo, hint, shuffle, and loss conditions.
- [ ] Capture the menu-to-game flow and available modes.
- [ ] Promote findings with confidence levels into `re/findings/`.

## M2 — Fidelity pass

- [ ] Replace provisional constants with values linked to findings.
- [ ] Implement confirmed board layouts and tile counts.
- [ ] Match the original selection, mismatch, hint, and shuffle feedback.
- [ ] Match the original timer and scoring behaviour.
- [ ] Add camera/scale behaviour that matches the original play area.
- [ ] Add regression fixtures for known boards and paths.

## M3 — Content pipeline

- [ ] Define a local, user-supplied asset pack format.
- [ ] Add a manifest with provenance and hashes for any permitted art.
- [ ] Provide a fallback placeholder set when no pack is installed.
- [ ] Document how to verify a pack without redistributing it.

## M4 — Release

- [ ] Accessibility pass with keyboard-only and screen-reader checks.
- [ ] Performance pass on low-end devices.
- [ ] Static hosting and a reproducible build artifact.
- [ ] Final legal review of names, notices, and asset handling.

## Non-goals

- Wrapping or redistributing the original executable.
- Shipping original artwork, audio, or third-party runtime DLLs.
- Reimplementing the Windows launcher; that belongs in
  [`kawai-win11-compat`](https://github.com/KiringYJ/kawai-win11-compat).
