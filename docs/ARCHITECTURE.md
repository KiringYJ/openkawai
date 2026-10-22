# Architecture

## Goals

1. Make the reverse-engineered rules the main source of complexity, not the
   rendering stack.
2. Keep board generation and matching deterministic and testable.
3. Ship a playable browser build without original assets.
4. Leave room for multiple layouts, tile vocabularies, and future game modes.

## Layers

```text
index.html
  └─ src/main.ts
       ├─ src/content/       data: layouts, placeholder tile kinds
       ├─ src/game/session   round state machine
       ├─ src/core/          pure board + pathfinding + RNG
       └─ src/ui/            DOM renderer and input
```

### `src/core/`

- **`board.ts`** owns the tile grid, pair removal, hint search, shuffle, and the
  two-turn path check. It has no DOM dependency.
- **`rng.ts`** provides mulberry32 and a seed helper. Supplying a seed makes a
  board reproducible for a finding or a bug report.

The board stores a one-cell empty border around the playable area. Public
coordinates are 0-based inside the playable area, while returned paths may use
`-1` or `rows`/`cols` to represent travel around the outside. The UI maps those
coordinates into the rendered outer ring.

### `src/game/`

`GameSession` is a small state machine: `playing`, `paused`, `won`, `lost`.
It owns selection, score, combo, timer, hints, shuffles, and restart. It emits
plain result objects rather than touching the DOM, so the whole round can be
tested without a browser.

### `src/ui/`

`GameView` renders the session into the static shell, delegates tile clicks,
draws the connection overlay, and manages the pause/result dialog. The board is
re-rendered after each interaction; 96 tiles is small enough that this is
simpler and less error-prone than maintaining per-tile DOM state.

### `src/content/`

Layouts and tile kinds are data. A layout currently defines the grid size, time
limit, and the allowed tile-kind IDs. A future non-rectangular layout can use
the `Board.fromGrid` hole support without changing the renderer.

## Matching algorithm

`Board.findPath(a, b)` runs a breadth-first search over
`(row, column, direction, turns)` states:

- Start at the first tile with no direction and zero turns.
- Move one cell at a time through empty cells.
- A direction change costs one turn; at most two are allowed.
- Reversing direction is disallowed.
- The target tile is only enterable as the final cell.
- The search may leave the board through its one-cell border.

Because the grid is small (14 × 10 including the border), the state space is
trivial. The first successful state is simplified into a polyline so the SVG
overlay draws only corners, not every traversed cell.

## Determinism

Board creation and shuffling take an `Rng`. `GameSession` exposes a `seed`
option and `restart(seed)`. Given the same seed, layout, and interaction
sequence, the board and shuffle results are reproducible.

## Extending the game

- **New layout:** add a `LayoutDefinition` in `src/content/layouts.ts` and pass
  it to `GameSession`.
- **New tile vocabulary:** replace or extend `TILE_KINDS`; keep IDs stable once
  they appear in a finding or a saved replay.
- **New scoring rule:** change only `GameSession.select` and cover it with a
  session test.
- **New renderer:** implement the same small `GameView` surface against the
  session; `src/core/` does not need to change.
- **Asset packs:** keep them outside the repository or under an ignored local
  directory until a lawful distribution route is documented.

## Testing

- `tests/board.test.ts` covers board construction, straight/one-turn/two-turn
  paths, rejection of longer paths, blocked boards, hints, and shuffle
  invariants.
- `tests/session.test.ts` covers selection transitions, scoring, combo reset,
  blocked matches, timer expiry, pause, hints, shuffles, and restart.

The UI is verified manually in a browser. Add a browser test harness only when
the interaction surface becomes large enough to justify the dependency.
