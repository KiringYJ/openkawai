# Project-Specific Agent Context

## Architecture

openkawai is a Vite + TypeScript + Vue + Vuetify web reimplementation of
**KAWAI 連連看 2004**. The code is split so the reverse-engineered rules do not
depend on the DOM:

- `src/core/` — pure board model, two-turn pathfinding, pair removal, hints,
  shuffles, and seeded RNG. No browser APIs.
- `src/game/` — `GameSession`, the run state machine (`playing`, `paused`,
  `cards`, `won`, `completed`, `lost`) covering rules and progression.
- `src/ui/` — Vue/Vuetify app, board pointer input, artwork, settings, menus,
  chance cards, and pause/result/name-entry/record dialogs.
- `src/content/` — level data, a curated animal candidate catalog, and five visual themes.
- `src/config/` — validated persistent settings and injected storage access.
- `src/game/high-scores.ts` — score ranking, name validation, and persistence.
- `public/tiles/` — 375 licensed images and a source/hash manifest.
- `src/main.ts` — composition root; mounts Vue with the Vuetify theme and icons.

The board is rendered as a CSS grid with a one-cell empty outer ring. The
`Board` pathfinder may return coordinates `-1` or `rows`/`cols` for travel
around the outside; the view maps those into the outer ring. A match is legal
when two identical tiles connect through empty cells with at most two turns.

The approach and trade-offs are recorded in `re/decisions/0001-*` and
`docs/ARCHITECTURE.md`. The project owner explicitly selected Vuetify on
2026-10-23; see `docs/decisions/0001-vuetify-presentation.md`. Do not add another
UI framework, state library, or rendering engine without a project decision.

## Build Commands

The repository pins Node 24.16.0 in `.node-version`; the package requires Node
22.12+ or 24+.

```sh
fnm use            # when fnm is available
npm install
npm run dev        # http://localhost:5173
npm run build      # vue-tsc --noEmit, then vite build
npm run preview    # serve dist/ at http://localhost:4173
```

Use the existing npm lockfile. Do not switch package managers or add a
dependency without a concrete need.

The build/typecheck scripts use `vue-tsc --noEmit`, including Vue templates.
TypeScript 6.0.3 is pinned for compatibility with vue-tsc 3.3.13; TypeScript 7
does not export the compiler entry point required by that checker.

## Test Commands

```sh
npm test           # Vitest: board, session, persistence, and asset integrity
npm run typecheck  # vue-tsc --noEmit
npm run build      # production build; includes type checking
```

For UI changes, also verify manually in a browser at desktop width and a narrow
viewport (around 375 px). Check all five art themes and settings persistence,
tile selection, a successful path (including a border route), a blocked pair,
hint, shuffle, paid pause/resume, restart, and the result/record dialogs.
The gameplay workspace must fit the viewport without page or board scrolling.
Keep the complete board centered and scale it to both available width and
height, including the outer path ring. Verify narrow, short landscape, and
zoom-equivalent CSS viewports as well as desktop sizes.
`npm run build` is the required final gate before reporting
completion.

## Important Files and Directories

| Path | Purpose |
| --- | --- |
| `src/core/board.ts` | Board invariants, pathfinding, hint, shuffle. |
| `src/core/rng.ts` | Deterministic mulberry32 and seed helpers. |
| `src/game/session.ts` | Run transitions, formulas, cards, timer, resources. |
| `src/ui/App.vue` | Session lifetime, timer, menus, and dialogs. |
| `src/ui/GameBoard.vue` | Vuetify tiles, pointer selection/cancellation, and connection paths. |
| `src/content/layouts.ts` | Confirmed levels, sizes, and difficulty timers. |
| `src/content/tile-catalog.json` | Curated candidates and pinned upstream path mappings. |
| `src/content/tile-kinds.ts` | Shared animal identity lookup. |
| `src/content/tile-themes.ts` | Five interchangeable local image themes. |
| `src/styles.css` | Visual system, responsive layout, animation policy. |
| `tests/board.test.ts` | Path and board invariants. |
| `tests/session.test.ts` | Round and scoring transitions. |
| `re/scope.md` | Target hash, legal boundary, and open questions. |
| `re/findings/` | Evidence-backed rule claims. |
| `re/decisions/` | Clean-room and asset-policy decisions. |
| `docs/ARCHITECTURE.md` | Layer boundaries and extension points. |
| `docs/ASSETS.md` | What may and may not enter the repository. |

## Domain Terms

- **連連看 (lianliankan)** — matching-pair game. Select two identical tiles
  connected by a legal path to remove them.
- **Tile kind** — the matchable identity (`elephant`, `giraffe`, …), not the visual
  asset. Multiple tiles share one kind.
- **Turn** — a change of direction in the connection polyline. Current rule:
  zero, one, or two turns.
- **Border** — the empty one-cell ring around the playable board; paths may
  travel through it.
- **Layout** — grid dimensions, time limit, and allowed tile kinds.
- **Session** — an eleven-level run, including score, resources, stars, timer, and phase.
- **Finding (`RE-NNNN`)** — an evidence-backed claim about the original game.
- **Provisional** — an implementation value not yet confirmed by a finding.

## Workspace Configuration

The following are shared project configuration and must stay tracked in normal
branch history:

`AI_AGENT_GUIDE.md`, `AI_AGENT_PROJECT.md`, `AGENTS.md`, `CLAUDE.md`,
`GEMINI.md`, `opencode.json`, `.agent-workbench.yaml`,
`.agent-workbench.lock.json`, `.agents/`, `.claude/`, and `.codex/`.

`AI_AGENT_GUIDE.md` and the vendor shims are generated by the agent-workbench
sync; do not hand-edit them. Project-specific rules belong in this file or in a
marked manual block in the guide. The Claude tier agents and routing binding are
generated copies; do not customize them per project.

The following remain local and untracked: `node_modules/`, `dist/`, `coverage/`,
`re/.local/`, `re/assets/extracted/`, original game directories, `inputs/`,
`compat/`, and `.env` files. Raw reverse-engineering output belongs under
`re/.local/`.

## Project-Specific Constraints

- **Correctness first:** correctness of reverse-engineered behavior and of the
  implementation outranks speed, token/turn efficiency, convenience, and
  preserving earlier conclusions. Use any lawful, authorized analysis method
  needed: static decompilation, resource/file/table inspection, controlled
  runtime probes, or local emulation. Prefer direct code/control-flow evidence;
  use runtime probes to validate, not as a substitute for code evidence. Never
  label a guess `confirmed`; mark it `inferred` or `unknown`, and when new
  evidence conflicts, correct or reject the old finding and update
  `re/RULESET.md` and `re/scope.md`.
- **Clean-room:** do not commit the original executable, game archive, extracted
  artwork/audio/fonts, third-party runtime binaries, or decompiled code. See
  `re/decisions/0002-*` and `docs/ASSETS.md`.
- **Evidence before fidelity:** confirmed rules are in `re/RULESET.md` and
  audited in `re/AUDIT.md`. Record a finding in `re/` before changing a rule
  that claims to match the original. Preserve the evidence's confidence limits.
- **Language policy:** code, comments, documentation, commit messages, and agent
  artifacts are English. The exception is user-facing game copy and the
  Traditional Chinese README section, which serve the target game's audience and
  are intentionally `zh-Hant`.
- **Interface copy:** keep labels, rules, and feedback concise and functional.
  Avoid slogans, promotional prose, anthropomorphism, and cutesy wording. This
  is a simple remake of the original game.
- **Tile presentation:** use tightly packed portrait rectangular faces. Keep
  interior faces flat; exposed sides use ivory planes with a consistent diagonal
  extrusion, covered by adjacent tiles. Center artwork and connection endpoints
  on the face.
- **Determinism:** board creation and shuffles must remain seedable. Do not
  introduce `Math.random()` into game state; use `src/core/rng.ts`.
- **Tests:** every rule change in `src/core/` or `src/game/` needs a unit test.
  Keep the current suite green and add cases for new edge cases.
- **Framework boundary:** the core/session must stay free of DOM and Vue APIs;
  Vue and Vuetify belong at the `src/ui/` and composition boundaries.
- **No original assets:** bundle only the licensed emoji artwork recorded in
  `public/tiles/manifest.json`, with notices/licences. Theme selection changes
  presentation only. A future custom pack loader must be opt-in and validated.
- **Scope:** the Windows compatibility launcher is a separate project
  (`kawai-win11-compat`). Do not add launcher, packaging, or binary-handling
  work here.
