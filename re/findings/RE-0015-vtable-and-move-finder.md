---
id: RE-0015
title: The form vtable maps 19 method slots; the move finder and level-specific dispatch are now identified
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
```

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
| 4 | 3 | `0x409980` + `0x409510` |
| 5 | 4 | `0x409980` |
| 6 | 5 | `0x40a490` + `0x40a020` |
| 7 | 6 | `0x40a490` |
| 8 | 7 | `0x40afa0` |
| 9 | 8 | `0x40ab40` |
| 10 | 9 | `0x409980` + `0x409510` |
| 11 | 10 | `0x40a490` + `0x40a020` |

Level 1 (index 0) takes the default path and calls none of these. The methods
are level-specific board/background update methods, not mutually exclusive
level generators; the earlier “11 routines = 11 levels” reading was wrong.

The decompiled `0x409040` reads `DAT_0041f118` cells only to test
`present == -1` and to choose what to draw; there are no writes to the board
array. The level-specific methods are therefore visual/background updates, not
gameplay-rule changes.

## Auto-shuffle

At `0x40d990` the post-match path calls the move finder:

```text
if move exists:
    no shuffle
else if resourceB > 0:
    resourceB -= 1
    call 0x408c00   (vtable 0x714)
    call 0x408b20   (vtable 0x710)
else:
    state = 2
    0x41F188 = 3
```

This is the static auto-shuffle/no-move contract. A live no-move probe was
inconclusive because the artificial board was not accepted as a normal
post-match state; the exact UI transition when B is exhausted still needs a
clean reproduction.

## Confidence and limits

High for the vtable map, the legal-move finder, the hint endpoint order and
highlight paint check, the level-specific dispatch, and the static
auto-shuffle branch.

The hint uses the move finder's most recent result rather than recomputing on
click; this was confirmed by matching the highlighted pair and observing the
endpoint fields advance to the next legal pair.

## Open questions

- What UI/game-over state follows auto-shuffle exhaustion? The static branch
  sets state 2 and `0x41F188=3` when resource B is empty.
- The level-specific methods are read-only with respect to the tile array and
  are treated as visual updates.

## Implementation impact

Use a legal-move finder for both hint and no-move detection. Keep the level
dispatch as visual/level behavior separate from the board rules. Implement
auto-shuffle as a one-use shuffle-B action when no move exists.
