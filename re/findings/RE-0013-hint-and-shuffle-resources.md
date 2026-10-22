---
id: RE-0013
title: The two HUD resources are hint (A) and shuffle (B), each costing one use
status: confirmed
confidence: high
target: KAWAI 連連看 2004 v1.01
environment:
  os: Windows 11 x64
  locale: zh-TW
evidence:
  - re/sessions/20261022-kawai2004-runtime.md
implementation:
  - src/game/session.ts
---

## Question

What do the two HUD resource counters do, which one is hint, and what does each
use cost?

## Method

Started a fresh level-1 game, read both counters and a hash of the live board,
clicked the top-right icons one at a time, and read the counters and board hash
again. The click coordinates were client `(505, 13)` for the left orange
circular-arrow icon and `(568, 13)` for the right blue star/flower icon.

The handlers at `0x41a07e` (shuffle) and `0x41a107` (hint) were also read.

## Observations

| Action | Resource A | Resource B | Board hash |
| --- | --- | --- | --- |
| fresh | 5 | 5 | `27b67471…` |
| click left icon | 5 | **4** | changed (`00810dc3…`) |
| click right icon | **4** | 4 | unchanged |

- **Resource A (`0x41F1AC`, right blue icon) is the hint.**
  - One use costs one A.
  - The handler requires A > 0 and hint flag `0x41F158 == 0`.
  - It sets `0x41F158 = -1`; the paint code uses that flag to draw a legal-pair
    highlight until the next match. The match handler resets it to 0.
- **Resource B (`0x41F1AE`, left orange arrow) is the shuffle.**
  - One use costs one B.
  - The handler requires B > 0 and calls the board shuffle/valid-move loop
    before decrementing B.
  - The board contents are rearranged; the board hash changed, as expected.
- Both counters start at 5/5 on level 1, gain +1 per level on continuation
  (RE-0010), and can be increased by card rewards (RE-0012).

The no-move path in the match handler at `0x40d9a6` checks resource B, calls
the shuffle methods, and decrements B. This is consistent with B being the
shuffle/auto-shuffle resource.

## Interpretation

```text
hint:
  requires resourceA > 0 and hint_active == false
  resourceA -= 1
  hint_active = true
  highlight one legal pair until the next match

shuffle:
  requires resourceB > 0
  resourceB -= 1
  rearrange the current tile multiset until a legal move exists (or the
  board loop settles)
```

The screen order is **shuffle on the left and hint on the right**. Internally,
**A = hint** and **B = shuffle**, which is the opposite of the left-to-right
screen order. Keep the numeric address mapping authoritative.

## Confidence and limits

High for the icon identity, the one-use costs, and the board-change behavior:
both were observed live and match the handlers.

The exact hint pair selection order and the exact shuffle permutation algorithm
are not yet measured. Auto-shuffle when no moves remain was read statically but
not reproduced with a controlled no-move board.

## Open questions

- Which legal pair does the hint choose when several exist?
- Does auto-shuffle consume B exactly once per invocation, and what happens
  when B reaches zero with no moves?
- Does a hint survive a shuffle or a level transition?

## Implementation impact

Model hint and shuffle as separate counters, not one generic resource. A hint
should select a legal pair and keep a transient highlight; a shuffle should
permute the remaining tiles and cost one shuffle use.
