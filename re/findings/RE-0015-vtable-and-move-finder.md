---
id: RE-0015
title: The form vtable maps the match, hint, shuffle, and level-start method slots
status: confirmed
confidence: high
target: KAWAI 連連看 2004 v1.01
environment:
  os: Windows 11 x64
  locale: zh-TW
evidence:
  - re/sessions/20261023-kawai2004-live-audit.md
  - re/sessions/20261022-kawai2004-runtime.md
implementation:
  - src/core/board.ts
  - src/game/session.ts
---

## Question

Which form methods are behind the vtable slots used by the match, hint, shuffle,
and level-transition paths?

## Method

Frida read the live form object at `0x733e70` and its vtable at `0x41feb8`.
Each vtable slot pointed to a five-byte relative jump thunk. The thunk target
was decoded statically:

```text
slot 0x708 -> thunk 0x402697 -> 0x408780
slot 0x70c -> thunk 0x4026a4 -> 0x4087b0
slot 0x710 -> thunk 0x4026b1 -> 0x408b20
slot 0x714 -> thunk 0x4026be -> 0x408c00
slot 0x718 -> thunk 0x4026cb -> 0x409040
slot 0x71c -> thunk 0x4026d8 -> 0x4092b0
slot 0x720 -> thunk 0x4026e5 -> 0x409510
slot 0x724 -> thunk 0x4026f2 -> 0x409980
slot 0x728 -> thunk 0x4026ff -> 0x40a020
slot 0x72c -> thunk 0x40270c -> 0x40a490
slot 0x730 -> thunk 0x402719 -> 0x40ab40
slot 0x734 -> thunk 0x402726 -> 0x40afa0
slot 0x738 -> thunk 0x402733 -> 0x40b400
slot 0x73c -> thunk 0x402740 -> 0x40b610
slot 0x740 -> thunk 0x40274d -> 0x40b6e0
slot 0x744 -> thunk 0x40275a -> 0x40baa0
slot 0x748 -> thunk 0x402767 -> 0x40be60
slot 0x74c -> thunk 0x402774 -> 0x40c830
slot 0x750 -> thunk 0x402781 -> 0x40d230
slot 0x754 -> thunk 0x40278e -> 0x40d430   (match handler)
slot 0x758 -> thunk 0x40279b -> 0x40dad0   (level start/continue)
slot 0x75c -> thunk 0x4027a8 -> 0x40de30
```

The extra three slots were decoded from the consecutive thunks after `0x750`
using objdump. In particular, the continuation block's `CALL [ECX+0x758]` at
`0x41a389` reaches `0x40dad0`, the level-start dispatcher, which explains why
the same timer/setup code runs on a continue while the score/resource block is
skipped for `level_index != 0`.

## Move finder and hint

`0x40b400` is the legal-move finder. It scans present cells in row-major order,
compares `match_id`, calls the path checker `0x40b610` (`0x73c`), and returns
`-1` when a move exists and `0` when none does.

On a found move it stores the two endpoints at:

```text
0x41F15A = column of endpoint 1
0x41F15C = row of endpoint 1
0x41F15E = column of endpoint 2
0x41F160 = row of endpoint 2
```

The coordinate order is **(column, row)**. A fresh board stored
`(2,1)` and `(12,1)`, which painted the magenta borders on row 1, columns 2
and 12. After matching that pair, the fields updated to `(4,1)` and `(6,1)`
for the next legal pair. The paint code at `0x417a84` compares the current
tile's column/row against these four words.

The hint handler sets `0x41F158 = -1` and consumes one hint resource. It does
**not** run the move finder itself; it highlights the most recent move-finder
result. That result is refreshed at level start and after every match/shuffle,
so it is normally current.

The shuffle handler calls the move finder repeatedly around the shuffle method
`0x408c00` until a move exists.

## Level-specific dispatch

After a match with tiles remaining, `0x40d928` computes `level_index - 1` and
uses the 10-entry jump table at `0x40da9c`:

| Level | Index | Methods |
| --- | --- | --- |
| 2 | 1 | `0x409040` |
| 3 | 2 | `0x4092b0` |
| 4 | 3 | `0x409510` |
| 5 | 4 | `0x409980` |
| 6 | 5 | `0x40a020` |
| 7 | 6 | `0x40a490` |
| 8 | 7 | `0x40afa0` |
| 9 | 8 | `0x40ab40` |
| 10 | 9 | `0x409980` + `0x409510` |
| 11 | 10 | `0x40a490` + `0x40a020` |

The L4 and L6 entries point into the middle of the L10/L11 case blocks, so L4
runs only `0x409510` and L6 only `0x40a020`. Level 1 (index 0) takes the default
path and calls none of these. The methods
are **post-match board rearrangement methods**, not visual/background updates.
The original README explicitly states that the 11 levels have different
`消牌重整方式`; the earlier “visual only” conclusion is rejected.

Static decompilation of the board-writing loops gives:

- **Level 2 / `0x409040`**: each column is compacted toward the bottom; the
  removed tiles' holes move to the top of the column (blocks fall down).
- **Level 3 / `0x4092b0`**: each row is compacted toward the left; holes move
  to the right end (blocks fall left).

The remaining level methods (`0x409980`, `0x409510`, `0x40a490`, `0x40a020`,
`0x40afa0`, `0x40ab40`) are decoded in
[RE-0018](RE-0018-level-rearrangement-methods.md). They are deterministic
row/column pack operations; the earlier "randomized control flow" hypothesis is
rejected. The conclusion comes from direct control flow, not from single-pair
observations.

## Auto-shuffle

At `0x40d990` the post-match path calls the move finder:

```text
if move exists:
    call 0x408b20   (vtable 0x710, chance setup)
else if resourceB > 0:
    call 0x408c00   (vtable 0x714, shuffle)
    resourceB -= 1
    call 0x408b20   (vtable 0x710, chance setup)
else:
    state = 2
    0x41F188 = 3
```

A natural 72-match level-1 run hit the auto-shuffle branch twice: B 99→98 at
match 17 and 98→97 at match 31. The B=0 failure branch was reproduced with a
controlled board (state 2, `0x41F188=3`).

## Confidence and limits

High for the vtable map, the legal-move finder, the hint endpoint order and
highlight paint check, the level-specific dispatch, and the static
auto-shuffle branch.

All level methods are now confirmed: L2 packs columns downward, L3 packs rows
left, L4/L6 are single-axis vertical splits, L5/L7 are single-axis horizontal
packs, L8/L9 are shears, and L10/L11 combine both axes; see RE-0018. Any prior
"visual only" statement is rejected.

The hint uses the move finder's most recent result rather than recomputing on
click; this was confirmed by matching the highlighted pair and observing the
endpoint fields advance to the next legal pair.

## Open questions

- What UI/game-over state follows auto-shuffle exhaustion? The static branch
  sets state 2 and `0x41F188=3` when resource B is empty.
- The L4–L11 transformations and their timing are resolved in RE-0018: they are
  deterministic and run once per non-final match, immediately or (when the card
  screen opens) after the last pick, before the move finder/free shuffle.

## Implementation impact

Use a legal-move finder for both hint and no-move detection. Implement the
level-specific rearrangement methods as board transformations; do not treat
them as visual effects. All eight transforms and the dispatch order are ready
to implement in RE-0018.
