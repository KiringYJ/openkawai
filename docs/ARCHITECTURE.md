# Architecture

## Boundaries

```text
index.html -> src/main.ts (Vue + Vuetify configuration)
                -> src/ui/App.vue (session lifetime, timer, menus, dialogs)
                   -> GameBoard.vue (tile pointer input, SVG connection path)
                   -> SettingsDialog.vue (theme and next-game preferences)
                   -> TileArtwork.vue (local image and glyph fallback)

src/game/session.ts -> src/core/board.ts + rng.ts
                   -> src/content/layouts.ts + tile-kinds.ts
src/game/high-scores.ts -> src/config/storage.ts (injected storage interface)
src/config/settings.ts -> tile-themes.ts + storage.ts
```

The presentation stack was selected explicitly by the project owner; see
[`decisions/0001-vuetify-presentation.md`](decisions/0001-vuetify-presentation.md).
The core and session have no Vue, DOM, or browser dependencies. Vuetify owns
controls, dialogs, navigation, progress, and feedback. Custom CSS is limited
to composition, animal tile geometry, focus/match feedback, and SVG paths.

## Board and coordinates

`Board` owns pair construction, legal paths, hints, shuffle, removal, and
level rearrangements. The playable grid is 16 columns × 9 rows. The session
samples 36 distinct kinds from the curated candidate pool for each level and
deals four copies of each. All themes share those identities; no separate
internal aliases are needed because the original aliases look and match alike.

Public coordinates are zero-based. Paths may use `-1`, `rows`, or `cols` to
travel through the one-cell empty ring. The renderer reserves the same ring
and maps tile centers and path points into one coordinate space.

Portrait tile faces fill their grid cells without row or column gaps. Their
exposed sides form ivory planes projected diagonally down and right; adjacent
tiles cover the interior sides. The SVG layer maps to face centers and keeps
its stroke independent of SVG scaling, narrowing it in small viewports to
avoid clipping. The one-cell outer ring retains the same size as an interior
cell. Its green background fits the board rather than filling the entire
available row; compact page and toolbar spacing leaves more room for tiles.

Pathfinding searches `(row, column, direction, turns)` states, permitting
orthogonal travel through empty cells with at most two turns. A target tile
is enterable only as the final cell. Paths are simplified into corner points.

Rearrangements pack whole tile objects in stable row/column order and update
their coordinates. Level 10 performs horizontal-outward then vertical-outward
packing; level 11 performs horizontal-inward then vertical-inward packing.
The split is columns 8/8 and rows 4/5. Shuffling permutes kinds within occupied
positions and preserves both holes and the remaining multiset.

## Session

`GameSession` owns these phases:

```text
playing -> paused -> paid resume shuffle -> playing
playing -> cards -> last pick -> deferred transform + free shuffle -> playing
playing/cards -> won -> continueLevel -> playing
playing/cards -> completed (level 11 clear)
playing -> lost (time expired or no moves/resources)
```

It applies difficulty/level formulas, resource limits, cached hints, chance
stars, weighted picks and the reward deck. A final-pair third star opens cards
before clear scoring. Level continuation preserves stars and score, adds a
hint, and adds a shuffle except on the weak difficulty.

The constructor snapshots the full candidate pool. Level creation and restart
sample a copy with the session RNG without changing that pool. The current
layout exposes only the selected kinds. Chance rerolls use this level's full
selection, including selected kinds already removed, rather than every
candidate or only the remaining tiles. Small custom layouts retain all their
kinds when fewer than 36 are supplied.

The view passes measured elapsed milliseconds to `tick`. In Classic, time
continues in background tabs and while settings/instructions are open; only
session phases that freeze time stop it. The app settles elapsed time before
a tile or helper action, preventing an action after an expired countdown from
saving the round.

`GameMode` is independent of Classic's three `Difficulty` values. Sessions
default to `classic`; `zen` uses the strong difficulty's scores, resources,
and card-pick weights. Zen keeps `timeLeftMs` at zero as an inactive timer,
ignores elapsed ticks and time top-ups, and omits the remaining-time clear
bonus. Its 18-card deck replaces time slots with hint/shuffle rewards. The
same level, pause, and no-move transitions apply. Mode is fixed for the
session and retained on restart. Only Classic runs can register high scores.

## Rendering and input

The session is held in a `shallowRef`, preserving the pure class instance.
Explicit revisions refresh a session snapshot only after game interactions.
A separate timer ref updates every 100 ms, keeping ticking independent of
board rendering. The SVG path is transient presentation state.

The board uses Vuetify tile buttons with labels and pressed state. During
gameplay, left-click selects tiles and right-click cancels an active selection;
hint, shuffle, pause/resume, and restart are available through the on-screen
action buttons. Empty cells are noninteractive. The gameplay shell shares the
centered 1200px maximum width of the menu and uses the dynamic viewport height;
information and actions reserve their own space while the board takes the
remaining area. A CSS size container fits the complete grid to both axes,
preserving the 3:4 tile faces and the empty outer ring without page or board
scrolling. Short and narrow layouts compact the surrounding controls. Viewport
size determines layout, never input type. Normal browser, form, and dialog
keyboard behavior outside gameplay remains unchanged. Routine actions use tile
feedback and updated counters rather than a status-message strip or
remaining-pair counter. A visually hidden live region announces action results
and exact hint coordinates. Storage warnings appear only when needed. Content
dialogs retain their own scrolling when needed.

## Content and persistence

`tile-catalog.json` is the shared candidate and upstream-path inventory used by
`tile-kinds.ts` and the dependency-free asset downloader. The selection criteria
and exclusions are recorded in [`ANIMAL_SELECTION.md`](ANIMAL_SELECTION.md).
`tile-themes.ts` maps each
stable kind to a local image path beneath Vite's configured base. The complete
art inventory and pinned upstream hashes are in `public/tiles/manifest.json`.

Settings and the three independent top-ten score tables use versioned
`localStorage` keys through an injected storage interface. Loading validates
untrusted stored data; failed reads/writes preserve play in memory. A run is
inserted only after the user submits a name. Blank names remain allowed. Other
names may contain up to 16 user-perceived characters (grapheme clusters) and
support safe Unicode, including Chinese, mixed case, emoji, and punctuation.
Case is preserved; unsafe invisible/control formatting is stripped before
plain-text display. Older padded Latin records remain compatible.
The shared parser applies NFC normalization and trims outer whitespace. It
bounds raw names to 1024 UTF-16 code units before segmentation and rejects names
over 16 graphemes rather than truncating them. Field composition stays raw;
preview, validation, loading, and saving use the domain parser. Table names use
bidirectional isolation and text interpolation, including literal markup.
Skipping or dismissing name entry returns to the menu without changing either
score table or storage.
Qualification is strictly above tenth place; ties are placed below existing
equal scores. Level 11 is the completed-game sentinel. Reload restores
preferences/records, not a session.

Settings preserve the next-game mode and Classic difficulty independently.
Older settings without a mode load as Classic; unknown modes fall back to
Classic without discarding valid theme or difficulty values. Mode changes do
not alter a running session, and the existing Classic score format is unchanged.

## Verification

- `board.test.ts`: paths, border routing, counts, shuffles, transformations,
  stable tile identities, and coordinates.
- `session.test.ts`: seeded per-level selection, formulas, phases, resources, chance cards, final-pair
  precedence, continuation, pause, and no-move failure.
- `persistence.test.ts`: theme/difficulty round trips, denied storage, input
  validation, score qualification, ties, and completed records.
- `assets.test.ts`: exact animal inventory, all five complete packs, binary
  signatures, paths, and SHA-256 hashes.

`npm run build` includes Vue/template type checking. Browser checks cover
desktop/narrow layouts, all emoji styles, selection, legal/blocked pairs,
hint/shuffle, paid pause, restart/exit, and dialogs. The original-game evidence
remains independently recorded under `re/`; tests do not replace that evidence.
