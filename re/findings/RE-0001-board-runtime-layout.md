---
id: RE-0001
title: The runtime board is an 18x11 VB array with 6-byte cells over a 16x9 playfield
status: confirmed
confidence: high
target: KAWAI 連連看 2004 v1.01
environment:
  os: Windows 11 x64
  locale: zh-TW
evidence:
  - re/sessions/20261022-kawai2004-runtime.md
  - re/sessions/20261023-kawai2004-alias-tiles.md
implementation:
  - src/core/board.ts
  - src/content/layouts.ts
---

## Question

What exact data structure represents a live board, and what are its dimensions
and cell fields?

## Method

Started the original v1.01 build in a DxWnd window and read the VB SAFEARRAY
descriptor at `0x0041F0F0` and the heap pointer at `0x0041F118` with
ReadProcessMemory. The board was read while level 1 was playable and again after
pairs had been removed. The 2026-10-23 alias-tile session then compared the
captured screenshot pixel by pixel to determine whether the eight high visual
IDs are visually distinct.

## Observations

1. The descriptor reports an element size of **6 bytes**, **18 columns**, and
   **11 rows**. The data pointer is heap-allocated and changes when a round is
   recreated.
2. The playable area is the inner **16 columns × 9 rows**; row 0 and row 10,
   and column 0 and column 17 are zeroed border cells.
3. Every playable cell is three little-endian `u16` values:
   - `present`: `0xFFFF` when a tile is present, `0` when empty;
   - `visual_id`: a sprite/tile identity;
   - `match_id`: the matching group.
4. At the start of level 1, all 144 playable cells were present.
5. The level-1 distribution was:
   - visual IDs 0–33: four tiles each (136 tiles);
   - visual IDs 34–41: one tile each (8 tiles).
   Pixel comparison of the captured level-1 screenshot shows that the four IDs
   in each high group are visually identical: 34/35/36/37 are the same green
   sprite, and 38/39/40/41 are the same gray sprite. The board therefore
   visibly contains **36 sprite kinds ×4**, not 42.
6. For normal tiles, `visual_id == match_id`. The eight alias tiles have
   `visual_id` 34–41 and `match_id` 34 or 35. The aliases form two match groups
   of four IDs each; each group is one visible sprite with four alias IDs.
7. Matching visual IDs 36 and 35 (both green aliases, `match_id` 34) removed
   both. This proves `match_id` is the key. Because the aliases are visually
   identical, the player sees an ordinary identical-tile match.
8. The same 16 × 9 structure and 6-byte cell layout were observed on level 2
   after a card-bonus return; only the occupancy changed.
9. A controlled sweep captured the initial board of **all 11 levels**. Every
   level started with **144 present cells** and the same multiset:
   - 34 normal visual IDs (0–33) ×4 each = 136 tiles;
   - 8 alias visual IDs (34–41) ×1 each = 8 tiles.
   This is **36 visible and matchable kinds ×4**: 34 normal sprite kinds with
   four identical copies each, plus two alias groups (match_id 34/35) that are
   visually one sprite each but carry four visual IDs. The 42 visual IDs are 36
   appearances plus six duplicate aliases. "Special" is an analysis label for
   the alias groups, not an in-game category.
   The alias positions changed between levels, so the deal is shuffled; no
   level used holes or a different board shape at the start.
10. Controlled level-1 starts at **弱 (difficulty 0)** and **超強
    (difficulty 2)** had the same 144-cell multiset: 36 visible kinds ×4
    (34 normal groups + 2 alias groups), with the same eight alias IDs.
    Difficulty changes timers/scores/resources, not the initial board
    composition.
11. The level-setup loop at `0x4087b0` builds the pool explicitly: indices
    0–135 get `visual_id = match_id = floor(index / 4)`; indices 136–143 get
    `visual_id = index - 102` (34–41) and `match_id = floor(index / 4)`
    (34/35). The four IDs per alias group are therefore a deliberate pool
    layout, not a readback artifact.

## Interpretation

The board contract is:

```text
grid: 18 columns x 11 rows (one-cell border on every side)
cell: u16 present, u16 visual_id, u16 match_id
playable: columns 1..16, rows 1..9 (144 cells)
total pairs at level start: 72
normal match groups: match_id 0..33
alias match groups: match_id 34 and 35 (four alias IDs each;
                     each group is one visible sprite)
```

`present` is not a tile-kind sentinel; it gates whether the other two fields
are meaningful. A generic implementation should store the logical match key
separately from the visual sprite ID.

## Confidence and limits

High for the structure, dimensions, present flag, and `match_id` behaviour:
they were observed directly in a live process and confirmed by a successful
alias-tile removal. The sprite-name mapping is descriptive only; the
authoritative values are the numeric IDs.

The 11-level sweep proves the initial full-board distribution at difficulty 1;
the difficulty 0/2 start checks show the same multiset. The shuffle handler
(RE-0013) copies whole 6-byte cell records into a temporary array and writes
them back to the occupied positions, so a shuffle preserves the exact multiset,
including the alias IDs, and only changes positions.

## Open questions

- Does a shuffle ever alter the alias-ID multiset? No: it moves existing cell
  records and never regenerates IDs (RE-0013).
- How does the shuffle permutation order the remaining tiles? It is a
  random swap-based permutation driven by the VB RNG; the exact RNG sequence is
  out of scope for a seedable clone.

## Implementation impact

The current `src/core/board.ts` uses string kinds and a separate padded grid.
It needs an explicit `visualId` / `matchId` split before it can reproduce the
alias-ID/group-match rule, and a 16 × 9 playfield with an 18 × 11 logical
border. A player-facing renderer only needs the 36 visible sprite kinds; the
six duplicate alias IDs can be collapsed without changing what the player
sees.
