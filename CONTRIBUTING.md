# Contributing

## Setup

Use Node.js 22.12+ or 24+. With `fnm` installed, `.node-version` selects the
pinned version automatically:

```sh
fnm use
npm install
npm run dev
```

## Before opening a change

Run the same checks CI should run:

```sh
npm test
npm run build
git diff --check
```

`npm run build` includes `vue-tsc --noEmit`, so it covers TypeScript and Vue templates as well as
the production bundle.

## Clean-room rules

This project reimplements a commercial game. Contributions must preserve the
clean-room boundary:

- Do not commit original executables, game archives, extracted artwork, audio,
  fonts, or third-party runtime binaries.
- Do not paste decompiled code, disassembly, or long pseudocode dumps into the
  repository. Record addresses, hashes, behaviour, and independently written
  summaries instead.
- Put raw investigation output under `re/.local/` (ignored) and promote only
  sanitised findings into `re/findings/`.
- When a behaviour is uncertain, implement it behind a named constant or a
  layout definition and mark the uncertainty in `re/scope.md`.

## Code conventions

- TypeScript strict mode, Vue single-file components, and Vuetify controls.
- Keep `src/core/` free of DOM and browser APIs.
- Prefer pure functions and explicit data over hidden global state.
- Use the seeded RNG (`mulberry32`) for anything that affects board state, so a
  finding can be replayed from a seed.
- Add or update a unit test for every rule change in `src/core/` or
  `src/game/`.
- Keep user-facing copy in Traditional Chinese; code and documentation in
  English unless the file is explicitly localised.

## Commit scope

A commit should do one thing. Separate evidence updates (`re/`) from behaviour
changes (`src/`) when practical, so a rule change can be reviewed against the
finding that justifies it.

## Reporting a rule mismatch

If the implementation disagrees with the original game, open a finding in
`re/findings/` with:

1. the exact build and environment;
2. the smallest reproducible board or sequence;
3. what the original does;
4. what openkawai does;
5. the evidence (capture, screenshot description, or recorded session).

Do not attach the original game or extracted assets to the issue.
