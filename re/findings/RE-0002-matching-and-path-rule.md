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
   did not remove. That pair is a **contradiction**, not yet explained, so the
   exact turn/path rule is confirmed only for the directly observed level-1
   cases.

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
border route. It is not yet proven that every level uses the same border/path
rule; the level-2 contradiction must be resolved first.

## Confidence and limits

High for the accepted border route, the two-turn limit, and special-tile
matching. Medium for the exact definition of a "turn" at cells adjacent to the
border and for level-specific exceptions.

The mismatch at 38 remaining tiles may be a stale board read during a screen
transition, an input timing failure, or a genuine level-specific restriction.
It is recorded rather than explained away.

## Open questions

- Does a turn at the padded border count the same as a turn inside the board?
- Are there level-specific blocked border cells or masks?
- Is a path allowed to pass through a cell whose `present` flag is zero but
  which is visually covered by another layer?
- What is the exact rejection timing when the same tile is clicked twice or a
  non-matching pair is selected?

## Implementation impact

The current BFS in `src/core/board.ts` matches the confirmed level-1 cases.
Add the level-2 contradiction as a regression fixture once its cause is known.
