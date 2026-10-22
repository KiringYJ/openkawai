---
id: RE-0002
title: Matching uses orthogonal paths with at most two turns and the outer border is traversable
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
  - tests/board.test.ts
---

## Question

What exact path is accepted when the player selects two tiles?

## Method

Read the live board array, enumerated candidate pairs, clicked the corresponding
cell centres, and observed whether the game removed both tiles, changed the
score, and advanced the timer. The decisive probe selected two tiles on the top
row whose direct line was blocked and whose accepted connection travelled
through row 0, the padded outer border.

## Observations

1. A direct horizontal pair `(1,11)-(1,12)` was accepted; score +4, remaining
   144 → 142.
2. A pair with a two-turn route through the padded outer border,
   `(1,7)-(1,10)`, was accepted; score +4, remaining 136 → 134. The accepted
   route was `(1,7) → (0,7) → (0,8) → (0,9) → (0,10) → (1,10)`.
3. Same-visual normal pairs are legal; different visual IDs are not.
4. Two special tiles with different visual IDs but the same `match_id` are
   legal (RE-0001).
5. A generic two-turn BFS found a path for a later level-2 pair that the game
   did not remove. That pair was recorded as an unexplained contradiction.
6. A controlled path oracle later placed two matching tiles on an otherwise
   empty board, optionally with blockers, and tested acceptance without relying
   on a natural board:
   - straight, one-turn, and two-turn interior detours were accepted;
   - a same-row pair with blockers on its direct line was accepted via a row
     above the line;
   - border routes on row 0 and column 0 were accepted;
   - the earlier rejected same-row detour was accepted when retested with a
     longer settle time.
   Repeated automation eventually reached the high-score screen, after which
   clicks were ignored. That screen, not a path restriction, explains the
   failed cases in that run.
7. The level-2 contradiction has not been reproduced under controlled
   conditions. The most likely causes are input timing, a stale board read
   during a transition, or the same hidden-screen state seen in the oracle.
   No level-specific path restriction has been demonstrated.

## Interpretation

The minimum confirmed contract is:

```text
- Manhattan movement only (no diagonal moves)
- path may traverse empty cells and the one-cell outer border
- at most two direction changes
- endpoints must be present tiles with equal match_id
- the path may not pass through other tiles
```

This is sufficient to reproduce the observed level-1 behaviour, including the
border route. The controlled oracle also accepted the same shapes on a later
level, so the same rule likely applies to all levels. The single level-2
mismatch is treated as an operational/state artifact until reproduced.

## Confidence and limits

High for the accepted border route, the two-turn limit, special-tile matching,
and the controlled interior/border path shapes. Medium for the exact definition
of a "turn" at cells adjacent to the border.

The single mismatch at 38 remaining tiles is recorded as an unexplained
observation, but it is not sufficient evidence for a level-specific path rule.
An automation that enters the high-score or another modal screen will ignore
board clicks; check the screen state before treating a click as a path failure.

## Open questions

- Does a turn at the padded border count the same as a turn inside the board?
- Are there level-specific blocked border cells or masks?
- Is a path allowed to pass through a cell whose `present` flag is zero but
  which is visually covered by another layer?
- What is the exact rejection timing when the same tile is clicked twice or a
  non-matching pair is selected?

## Implementation impact

The current BFS in `src/core/board.ts` matches the confirmed cases, including
interior detours and border routes. Do not add a level-specific exception for
the unresolved level-2 click without a reproducible state trace.
