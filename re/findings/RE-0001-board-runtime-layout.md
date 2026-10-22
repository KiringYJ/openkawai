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
pairs had been removed.

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
6. For normal tiles, `visual_id == match_id`. For the eight special tiles,
   `visual_id` is unique in 34–41 while `match_id` is 34 or 35. The eight
   specials therefore form two groups of four, i.e. two legal pairs each.
7. Matching two special tiles with different visual IDs (36 and 35) but the
   same `match_id` (34) removed both. This proves `match_id` is the matching
   key for special tiles.
8. The same 16 × 9 structure and 6-byte cell layout were observed on level 2
   after a card-bonus return; only the occupancy changed.
9. A controlled sweep captured the initial board of **all 11 levels**. Every
   level started with **144 present cells** and the same multiset:
   - 34 normal visual IDs (0–33) ×4 each = 136 tiles;
   - 8 special visual IDs (34–41) ×1 each = 8 tiles.
   The special positions changed between levels, so the deal is shuffled; no
   level used holes or a different board shape at the start.

## Interpretation

The board contract is:

```text
grid: 18 columns x 11 rows (one-cell border on every side)
cell: u16 present, u16 visual_id, u16 match_id
playable: columns 1..16, rows 1..9 (144 cells)
total pairs at level start: 72
normal pair score groups: match_id 0..33
special match groups: match_id 34 and 35 (four visual variants each)
```

`present` is not a tile-kind sentinel; it gates whether the other two fields
are meaningful. A generic implementation should store the logical match key
separately from the visual sprite ID.

## Confidence and limits

High for the structure, dimensions, present flag, and `match_id` behaviour:
they were observed directly in a live process and confirmed by a successful
special-tile removal. The sprite-name mapping is descriptive only; the
authoritative values are the numeric IDs.

The 11-level sweep proves the initial full-board distribution at difficulty 1.
It does not prove that reshuffles or difficulty changes preserve the same
multiset.

## Open questions

- Does difficulty 0/2 change the initial distribution?
- How does the level-specific reshuffle operate on this array?
- Is there any level that intentionally starts with holes under another menu
  mode?

## Implementation impact

The current `src/core/board.ts` uses string kinds and a separate padded grid.
It needs an explicit `visualId` / `matchId` split before it can reproduce the
special-tile rule, and a 16 × 9 playfield with an 18 × 11 logical border.
