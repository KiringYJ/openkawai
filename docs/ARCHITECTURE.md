# Architecture

## Boundaries

```text
index.html -> src/main.ts (Vue + Vuetify configuration)
                -> src/ui/App.vue (session lifetime, timer, menus, dialogs)
                   -> GameBoard.vue (tile input, focus, SVG connection path)
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
level rearrangements. The playable grid is 16 columns × 9 rows, with 36 kinds
appearing four times each. All themes share those identities; no separate
internal aliases are needed because the original aliases look and match alike.

Public coordinates are zero-based. Paths may use `-1`, `rows`, or `cols` to
travel through the one-cell empty ring. The renderer reserves the same ring
and maps tile centers and path points into one coordinate space.

Portrait tile faces fill their grid cells without row or column gaps. Their
exposed sides form ivory planes projected diagonally down and right; adjacent
tiles cover the interior sides. The SVG layer maps to face centers and keeps a
constant stroke width when stretched.

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

The view passes measured elapsed milliseconds to `tick`. Time continues in
background tabs and while settings/instructions are open; only session phases
that freeze time stop it. The app settles elapsed time before a tile or helper
action, preventing an action after an expired countdown from saving the round.

## Rendering and input

The session is held in a `shallowRef`, preserving the pure class instance.
Explicit revisions refresh a session snapshot only after game interactions.
A separate timer ref updates every 100 ms, keeping ticking independent of
board rendering. The SVG path is transient presentation state.

The board uses Vuetify tile buttons with labels and pressed state, a roving
tab stop, arrow navigation, and focus restoration after removal. Empty cells
are noninteractive. Smaller layouts scroll only the board; page content and
dialogs fit the viewport. Viewport size determines layout, never input type.

## Content and persistence

`tile-kinds.ts` holds the exact 36 selected animals. `tile-themes.ts` maps each
stable kind to a local image path beneath Vite's configured base. The complete
art inventory and pinned upstream hashes are in `public/tiles/manifest.json`.

Settings and the three independent top-ten score tables use versioned
`localStorage` keys through an injected storage interface. Loading validates
untrusted stored data; failed reads/writes preserve play in memory. A run is
inserted only after the user submits a name. Qualification is strictly above
tenth place; ties are placed below existing equal scores. Level 11 is the
completed-game sentinel. Reload restores preferences/records, not a session.

## Verification

- `board.test.ts`: paths, border routing, counts, shuffles, transformations,
  stable tile identities, and coordinates.
- `session.test.ts`: formulas, phases, resources, chance cards, final-pair
  precedence, continuation, pause, and no-move failure.
- `persistence.test.ts`: theme/difficulty round trips, denied storage, input
  validation, score qualification, ties, and completed records.
- `assets.test.ts`: exact animal inventory, all five complete packs, binary
  signatures, paths, and SHA-256 hashes.

`npm run build` includes Vue/template type checking. Browser checks cover
desktop/narrow layouts, all emoji styles, selection, legal/blocked pairs,
hint/shuffle, paid pause, restart/exit, and dialogs. The original-game evidence
remains independently recorded under `re/`; tests do not replace that evidence.
