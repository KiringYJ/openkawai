# 2026-10-23 — alias visual IDs 34–41

## Setup

| Field        | Value |
| ------------ | ----- |
| Target       | KAWAI 連連看 2004 v1.01 |
| Archive SHA  | `3e722be316006e07fa3da8c39fa7926db41966b1501f756513df2335a93142c8` |
| Analysis SHA | `f1eab078fa65f6fe63b2d5966adcddd1a24abfc99c6706ec30f033965e58f75a` (`Kawai2004.unpacked.exe`) |
| Live capture | `re/.local/evidence/levels/level-01.json` and `level-01.png` |
| Tools        | PowerShell + System.Drawing pixel comparison |
| Input        | Lawfully owned local copy; no game process started this round |

## Question

Are visual IDs 34–41 eight visually distinct tile designs, or duplicate sprite
entries that look like ordinary tiles?

## Procedure

1. Parsed the level-1 JSON and counted `visual_id` and `match_id`.
2. Cropped the eight cells with `visual_id >= 34` from the level-1 screenshot
   using the known 40 × 50 grid.
3. Compared the crops pixel by pixel. The first crop (row 1, column 1) sits on
   the outer board edge, so the comparison was repeated among the interior
   members of each group.

## Observations

- The 36-sprite kind sheet (`re/.local/evidence/screens/kind-sheet.png`) shows
  exactly 36 visible tile designs, matching the player-facing count.
- The board has 144 present cells.
- `visual_id` counts: IDs 0–33 ×4 each (136 tiles); IDs 34–41 ×1 each (8 tiles).
  Total 42 distinct visual IDs.
- `match_id` counts: IDs 0–35 ×4 each. Total 36 match groups.
- Pixel comparison:
  - visual IDs 34, 35, 36, 37 are the same green sprite (interior comparisons
    differ by 0 pixels; the row-1/column-1 crop differs only on the left two
    border columns);
  - visual IDs 38, 39, 40, 41 are the same gray sprite (all comparisons differ
    by 0 pixels).
- The level-setup loop at `0x4087b0` builds this pool explicitly: indices
  0–135 get `visual_id = match_id = floor(index / 4)`; indices 136–143 get
  `visual_id = index - 102` (34–41) and `match_id = floor(index / 4)` (34/35).
  The four IDs per alias group are deliberate pool slots.
- Therefore the visible board contains **36 sprite kinds ×4**, not 42. The
  extra six IDs are duplicate aliases: two visible sprites with four IDs each.

## Evidence

- `re/.local/evidence/levels/level-01.json` (raw board; untracked)
- `re/.local/evidence/levels/level-01.png` (screenshot; untracked)
- `re/.local/evidence/screens/level-01-specials-marked.png` (red = match 34,
  blue = match 35; untracked)
- `re/.local/evidence/screens/level-01-specials-crops.png` (3× crop montage;
  untracked)

All 11 captured level JSONs have the same counts: 144 present, 42 visual IDs,
36 match groups, 136 normal tiles, 8 alias tiles.

## Limitations

- Pixel comparison was done on the level-1 screenshot. The other 10 levels have
  the same visual-ID/match-ID counts, but their alias crops were not compared
  pixel by pixel.
- The reason the original data uses four IDs for one sprite is not documented
  in the binary; it may be an atlas or authoring artifact. The rule itself is
  clear.

## Follow-ups

- None for the clone rule. A renderer can collapse the six duplicate alias IDs
  to the two visible sprites.
