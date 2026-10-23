---
id: RE-0018
title: All eleven levels use deterministic row/column packing; L10/L11 combine both axes
status: confirmed
confidence: high
target: KAWAI 連連看 2004 v1.01
environment:
  os: Windows 11 x64
  locale: zh-TW
evidence:
  - re/sessions/20261023-kawai2004-live-audit.md
  - re/sessions/20261023-kawai2004-level-transforms.md
implementation:
  - src/core/board.ts
  - src/game/session.ts
---

## Question

What exactly does each level do to the board after a non-final match, when does
it run, and is any of it randomized?

## Method

The unpacked executable was opened with REA/Ghidra and the complete instruction
bodies of the eight level methods were read. The ten-entry jump table at
`0x40da9c` was decoded, and the ten switch-case blocks were disassembled with
objdump because Ghidra's reported body for `0x40d430` excludes the jump-table
targets. The card-screen close handler `0x4152b3` and its second jump table at
`0x415450` were also read. Two entries (L4/L6) point into the middle of a
two-call block, so each target was decoded as an instruction address rather
than as the start of the preceding block. The decoded directions were
cross-checked against the eleven captured level names. See the session log for
the exact addresses and procedure.

## Observations

### Primitives

The board is the 16 × 9 playfield of 6-byte cells from RE-0001. A transform
only moves whole cells between positions in the same row or column; it never
moves a cell to a different row and column at the same time. The relative order
of the surviving cells is preserved.

```text
packRowLeft(row):    take the present cells left-to-right;
                     write them to columns 1..n.
packRowRight(row):   take the present cells left-to-right;
                     write them to columns 16-n+1..16.
packColumnUp(col):   take the present cells top-to-bottom;
                     write them to rows 1..n.
packColumnDown(col): take the present cells top-to-bottom;
                     write them to rows 9-n+1..9.
```

`n` is the number of present cells in the affected row or column. A segment is
left unchanged when `n` is zero or already fills the segment.

### The eight methods

| Address | Effect |
| --- | --- |
| `0x409040` | Every column packs down. |
| `0x4092b0` | Every row packs left. |
| `0x409980` | Rows split at columns 8/9: columns 1–8 pack left; columns 9–16 pack right. |
| `0x409510` | Columns split at rows 4/5: rows 1–4 pack up; rows 5–9 pack down. |
| `0x40a490` | Rows split at columns 8/9: columns 1–8 pack right; columns 9–16 pack left. |
| `0x40a020` | Columns split at rows 4/5: rows 1–4 pack down; rows 5–9 pack up. |
| `0x40ab40` | Rows 1–4 pack left; rows 5–9 pack right. |
| `0x40afa0` | Columns 1–8 pack down; columns 9–16 pack up. |

### Level dispatch

The jump table is indexed by `level_index - 1`; level 1 (index 0) takes the
default path and calls none of the methods.

| Level | Index | Calls, in order |
| --- | --- | --- |
| 1 | 0 | none |
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

The L4 and L6 table entries point into the middle of the L10/L11 blocks:
`0x40d979` is the second call of the block at `0x40d972`, and `0x40d989` is
the second call of the block at `0x40d982`. L4 therefore executes only
`0x409510`, and L6 only `0x40a020`; L10 and L11 execute both calls.

### Timing

At `0x40d8d3` the match handler checks `remaining >= 1` and enters the dispatch
at `0x40d928`. The final pair leaves `remaining == 0` and goes directly to the
clear branch, so the transformation does not run on a level clear. Every case
then jumps to `0x40d990`, which calls the legal-move finder `0x40b400`; the
no-move/auto-shuffle decision follows that call. For an ordinary non-final
match the transformation therefore runs once, immediately after the match and
before the move check.

### Card-screen deferral

A match that earns the third chance star opens the card screen before the
normal post-match path. The transform is not skipped: the card-screen close
handler at `0x4152B3` checks the remaining picks. When the last pick closes the
screen and tiles remain, it runs the same ten-case dispatch through the second
jump table at `0x415450`, then calls the shuffle `0x408C00` and the chance setup
`0x408B20` before returning to play. The free shuffle does not consume B and
preserves the occupied positions, so the transform's hole pattern survives while
the tile identities are permuted; the chance kind may change. On level 1 the
transform dispatch takes its no-op default, but the free shuffle and chance
refresh still run. If the board is empty, the close path goes to the clear state
instead.

### Determinism

None of the eight methods calls the VB RNG. The floating-point sequences in
`0x409980` and `0x40a490` are the constant `16.0 / 2.0` loop bounds, converted
with `__vbaFpI2`, `__vbaFpI4`, and `__vbaFpR4`. The transformations are
deterministic functions of the current board.

## Interpretation

```text
on non-final match:
    remove the pair
    award score and time
    remaining -= 2
    if the third chance star opened the card screen:
        defer the transformation until the last card pick
    else if remaining > 0:
        apply the level's transformation(s) in the recorded order
        run the legal-move finder
        if no move and resourceB > 0: consume one B and shuffle
        if no move and resourceB == 0: failure

on last card pick (picks reaches 0):
    close the card screen
    stars = 0
    if remaining > 0:
        apply the level's transformation(s) in the recorded order
        free shuffle (no B cost)
        re-select the chance kind
```

The transforms are stable partitions, not gravity simulations with random
choices:

- L2 sinks every column.
- L3 packs every row left.
- L4 packs columns away from the centre vertically (rows 1–4 up, rows 5–9
  down).
- L5 packs rows away from the centre horizontally.
- L6 packs columns toward the centre vertically (rows 1–4 down, rows 5–9 up).
- L7 packs rows toward the centre horizontally.
- L8 sinks columns 1–8 and lifts columns 9–16.
- L9 packs rows 1–4 left and rows 5–9 right.
- L10 applies L5's outward row pack, then L4's outward column pack.
- L11 applies L7's inward row pack, then L6's inward column pack.

The level names corroborate every direction: L4 開天闢地 separates top from
bottom, L5 左右開弓 separates left from right, L6 上下同心 converges vertically,
L7 左右逢源 converges horizontally, L10 四大皆空 empties the centre, and L11
萬佛朝宗 converges toward it.

## Confidence and limits

High and confirmed statically: every loop bound, copy destination, and dispatch
target was read directly. The eight methods have no RNG call and no
level-specific branch inside them. The L10/L11 pairs are ordered by the case
block and must be preserved. L4 and L6 intentionally enter the second half of
those blocks and execute only the vertical call. The second dispatch table at
`0x415450` uses the same ten level mappings and vtable calls as `0x40DA9C`, so
the deferred card-screen path uses the same level rules.

A controlled live marker test then verified all ten levels (indices 1–10):
a sparse board with marker pairs was matched, the post-match board was read,
and every cell matched the predicted transform for that level (0 mismatches
for each of the 10 levels, state 0). This includes the L4/L6 single-axis
fall-through and the L10/L11 two-call order.

The card-close deferral was isolated at level index 9 (L10) by hooking the
free-shuffle entry `0x408C00`: the board captured there, before the shuffle,
matched the predicted L10 transform exactly (10/10 present cells).

The static session did not run the original game; the later marker test did.
The visual animation (if any) is not described. The board-state result is the
copy destination of each method, which is the rule that matters for a clone.

## Open questions

- Does the original animate the tiles between their old and new positions? This
  is presentation, not board state.
- Is the transformation identical after a manual shuffle? Shuffle is a separate
  method; the post-match transform reads whatever board exists at that moment,
  so the same rule applies.

## Implementation impact

Add a pure `rearrangeBoard(board, levelIndex)` operation in the DOM-free core.
Implement the four packing primitives and compose them per the table above. Call
it after pair removal when tiles remain, before `hasMoves()` and the
auto-shuffle/failure decision. If the third chance star opened the card screen,
defer it until the last pick, then apply it before the free shuffle and chance
refresh. Add tests for each primitive, each level mapping, the L10/L11 call
order, the L4/L6 single-call fall-through, the final-pair skip, and the
card-screen deferral.
