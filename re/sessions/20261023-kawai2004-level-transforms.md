# 2026-10-23 — post-match level transformations

## Setup

| Field        | Value |
| ------------ | ----- |
| Target       | KAWAI 連連看 2004 v1.01 |
| Archive SHA  | `3e722be316006e07fa3da8c39fa7926db41966b1501f756513df2335a93142c8` |
| Analysis SHA | `f1eab078fa65f6fe63b2d5966adcddd1a24abfc99c6706ec30f033965e58f75a` (`Kawai2004.unpacked.exe`) |
| OS           | Windows 11 x64 |
| Locale       | zh-TW |
| Display      | 2560 × 1440 host desktop; no game process started |
| Tools        | REA 6.7.0, Ghidra 12.1.4, GNU objdump 2.42 |
| Input        | Lawfully owned local copy; no runtime patching |

## Question

What are the exact post-match board transformations for levels 2–11, in what
order do they run, and does any of them use randomness?

## Procedure

1. Open `Kawai2004.unpacked.exe` in REA with the existing Ghidra analysis
   snapshot and confirm the SHA-256 above.
2. Read the complete instruction bodies of the eight candidate methods:
   `0x409040`, `0x4092b0`, `0x409510`, `0x409980`, `0x40a020`, `0x40a490`,
   `0x40ab40`, and `0x40afa0`.
3. Read the ten-entry post-match jump table at `0x40da9c`.
4. Disassemble the ten switch-case blocks at `0x40d93c`–`0x40d989` with
   `objdump -D -M intel` to recover the vtable call order inside each level
   case.
5. Cross-check the decoded directions against the eleven level names captured
   in `re/.local/evidence/levels/`.

The switch-case blocks are jump-table targets and are not included in Ghidra's
reported body range for `0x40d430`; objdump was used only to read those target
addresses. No original instructions or bytes are copied into this repository.

## Observations

All eight methods operate on the live 16 × 9 playfield (columns 1–16, rows
1–9) and on the 6-byte cell records described in RE-0001. They count cells whose
`present` word is `0xFFFF`, copy those records into a temporary array in scan
order, and then write them back to one side of a row or column. The temporary
array preserves the relative order of the remaining tiles.

The two building blocks are:

```text
pack row left:   present cells, left-to-right, become columns 1..n
pack row right:  present cells, left-to-right, become columns 16-n+1..16
pack column up:  present cells, top-to-bottom, become rows 1..n
pack column down:present cells, top-to-bottom, become rows 9-n+1..9
```

`n` is the number of present cells in the affected segment. A segment is
skipped when `n` is zero or already fills the segment.

The eight methods decode as:

| Address | Effect |
| --- | --- |
| `0x409040` | Every column packs down. |
| `0x4092b0` | Every row packs left. |
| `0x409980` | Rows split at the 8/9 column boundary: columns 1–8 pack left, columns 9–16 pack right. |
| `0x409510` | Columns split at the 4/5 row boundary: rows 1–4 pack up, rows 5–9 pack down. |
| `0x40a490` | Rows split at the 8/9 column boundary: columns 1–8 pack right, columns 9–16 pack left. |
| `0x40a020` | Columns split at the 4/5 row boundary: rows 1–4 pack down, rows 5–9 pack up. |
| `0x40ab40` | Rows 1–4 pack left, rows 5–9 pack right. |
| `0x40afa0` | Columns 1–8 pack down, columns 9–16 pack up. |

The switch table at `0x40da9c` and the case blocks give this dispatch:

| Level | Index | Calls, in order |
| --- | --- | --- |
| 1 | 0 | none (default path to the move check) |
| 2 | 1 | `0x409040` |
| 3 | 2 | `0x4092b0` |
| 4 | 3 | `0x409510` |
| 5 | 4 | `0x409980` |
| 6 | 5 | `0x40a020` |
| 7 | 6 | `0x40a490` |
| 8 | 7 | `0x40afa0` |
| 9 | 8 | `0x40ab40` |
| 10 | 9 | `0x409980`, then `0x409510` |
| 11 | 10 | `0x40a490`, then `0x40a020` |

The L4 and L6 table targets are the second calls inside the L10/L11 blocks:
`0x40d979` is the `0x409510` call of the block at `0x40d972`, and `0x40d989`
is the `0x40a020` call of the block at `0x40d982`. L4 therefore runs only
`0x409510` and L6 only `0x40a020`; L10/L11 run both calls.

`0x40d8d3` compares the remaining-tile counter with 1 and enters the dispatch
at `0x40d928` only while tiles remain. The final pair therefore skips the
transformation and goes to the clear branch. Each case jumps to `0x40d990`,
which calls the legal-move finder (`0x40b400`). For an ordinary non-final match
the transformation therefore runs after the match and before the no-move /
auto-shuffle decision.

A third chance star opens the card screen before that path. The card-screen
close handler at `0x4152b3` checks the picks counter; when the last pick closes
the screen and tiles remain, it runs a second ten-case dispatch through the
jump table at `0x415450`, then calls `0x408c00` (shuffle) and `0x408b20`
(chance setup). The second table uses the same ten level mappings and vtable
calls; its case-block targets are `0x41534d`, `0x415356`, `0x41538a`,
`0x41535f`, `0x41539a`, `0x415368`, `0x415371`, `0x41537a`, `0x415383`,
`0x415393`. The free shuffle does not decrement B and preserves the occupied
positions; it permutes the tile identities and may change the chance kind. If
the board is empty, the close path goes to the clear state instead.

None of the eight methods calls the VB RNG. The floating-point sequences in
`0x409980` and `0x40a490` are constant `16.0 / 2.0` conversions used as loop
bounds and comparisons; the only conversion imports are `__vbaFpI2`,
`__vbaFpI4`, and `__vbaFpR4`. The transformations are deterministic.

The level names are consistent with the decoded directions:

| Level | Name | Transformation meaning |
| --- | --- | --- |
| 4 | 開天闢地 | columns pack up/down outward, away from the centre |
| 5 | 左右開弓 | rows pack left/right outward |
| 6 | 上下同心 | columns pack up/down inward, toward the centre |
| 7 | 左右逢源 | rows pack left/right inward |
| 8 | 上天入地 | left columns fall, right columns rise |
| 9 | 失之交臂 | top rows move left, bottom rows move right |
| 10 | 四大皆空 | both axes pack outward; the centre empties |
| 11 | 萬佛朝宗 | both axes pack inward; the tiles converge |

## Evidence

- REA/Ghidra function bodies for the eight addresses.
- Jump table bytes at `0x40da9c`: ten little-endian targets
  `0x40d93c`, `0x40d945`, `0x40d979`, `0x40d94e`, `0x40d989`,
  `0x40d957`, `0x40d960`, `0x40d969`, `0x40d972`, `0x40d982`.
- objdump case disassembly at `0x40d93c`–`0x40d989`.
- Second dispatch table bytes at `0x415450` and the card-close block
  `0x4152b3`–`0x4153a1`.
- Captured level names under `re/.local/evidence/levels/` (not tracked).

## Limitations

- This session did not run the game. The transformations are confirmed from
  control flow and copy destinations, not from a new live A/B capture.
- The card-close free shuffle is also static. The 2026-10-22 86-tile
  card-screen observation is consistent with it, but that session did not hash
  the board immediately before and after the close.
- The original may animate the change visually; the animation is out of scope.
- The exact order of the two calls in levels 10 and 11 is recorded from the case
  blocks and must be preserved because the two transformations can move
  different tiles into each other's segments. L4 and L6 enter the second half
  of those blocks and execute only the vertical call.

## Follow-ups

1. Add a pure board-rearrangement function and one test per primitive plus one
   test per level mapping.
2. If a live probe is desired, force a small controlled board, match one pair,
   and compare the post-match array against the predicted transformation.
