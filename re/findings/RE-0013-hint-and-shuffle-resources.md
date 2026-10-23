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
  - re/sessions/20261023-kawai2004-live-audit.md
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
  - Live: A 4 → 3 on the first hint click; a second click while the flag was
    still -1 left A at 3 and the endpoints unchanged. The hint is unavailable
    until the highlighted pair is matched.
- **Resource B (`0x41F1AE`, left orange arrow) is the shuffle.**
  - One use costs one B.
  - The handler requires B > 0 and calls the board shuffle/valid-move loop
    before decrementing B.
  - The board contents are rearranged; the board hash changed, as expected.
  - A separate free shuffle runs when the last card pick closes the card
    screen; it does not consume B (RE-0012).
  - Pause (v1.01) requires B > 0. Entry only freezes the timer; the resume
    click shuffles and spends one B. It does not re-roll the chance kind
    (RE-0017).
- Both counters start at 5/5 at difficulty 1/2 (8/8 at difficulty 0).
  Continuation adds +1 to A and, at difficulty 1/2 only, +1 to B; card rewards
  can raise either (RE-0010, RE-0012).

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

The hint highlight uses the move finder's most recent pair, stored as
`(column,row)` at `0x41F15A/15C` and `0x41F15E/160`; it does not recompute on
click. The move finder scans row-major, so the hint is the first legal pair in
that order (RE-0015). The hint flag `0x41F158` is cleared by the next match, not
by a shuffle; the shuffle path runs the move finder again and refreshes the
endpoint fields. The exact shuffle permutation algorithm is out of scope (RNG
sequence), but the handler moves whole cell records and preserves the remaining
multiset.

Auto-shuffle when no moves remain consumes exactly one B and reruns the
shuffle/chance setup. A natural 72-match level-1 run hit it twice: B 99→98 at
match 17 and 98→97 at match 31. When B is zero, the same branch enters the
shared failure state (state 2, reason flag 3); this was reproduced with a
controlled board.

## Open questions

- Which legal pair does the hint choose when several exist? The first legal
  pair in row-major scan order (RE-0015).
- Does auto-shuffle consume B exactly once per invocation, and what happens
  when B reaches zero with no moves? Yes, one B; B=0 enters the shared failure
  branch.
- Does a hint survive a shuffle or a level transition? The endpoint data is
  refreshed by the move finder at level start and after a shuffle; the highlight
  flag itself is cleared on the next match.

## Implementation impact

Model hint and shuffle as separate counters, not one generic resource. A hint
should select a legal pair and keep a transient highlight; a shuffle should
permute the remaining tiles and cost one shuffle use.
