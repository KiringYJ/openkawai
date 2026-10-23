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
  - re/sessions/20261023-kawai2004-live-audit.md
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
3. Same-visual normal pairs are legal; different normal visual IDs are not.
4. Two alias tiles with different visual IDs (35 and 36) but the same
   `match_id` (34) are legal. Both IDs are visually identical aliases of the
   same green sprite, so the player sees an ordinary identical-tile match
   (RE-0001).
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
   The post-match level transform (RE-0018) moves tiles after every non-final
   match, so a board read taken before the redraw can describe a stale layout.
   No level-specific path restriction has been demonstrated.
8. The path dispatcher `0x40b610` orders the two endpoints and dispatches:
   - same row → `0x40b6e0`
   - same column → `0x40baa0`
   - different row and column → `0x40be60` or `0x40c830`,
     depending on the relative column order.
   The sub-checkers implement the straight/one-turn/two-turn and outer-border
   cases and write animation corner points to `0x41F148`–`0x41F14E`.
   The control oracle's accepted shapes are consistent with this dispatcher.
9. A later controlled live test used a sparse board and clicked known pairs:
   straight, one-turn, and a top-row border route with blockers were accepted
   (score +4 each); a pair fully enclosed by a 3×3 blocker ring was rejected
   with the remaining count unchanged. A real right-button mouse event after
   selecting the first tile canceled the selection, so the next left click
   selected rather than matched (remaining stayed 4).
10. The built-in `遊戲說明` screen states the same rule directly:
   - `連線路徑不得超過二個轉折`
   - `不能穿過其他牌`
   - `MOUSE 左鍵 - 選取，右鍵 - 取消`
   This confirms the two-turn model and adds the right-click cancel behavior.

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

High for the accepted border route, the two-turn limit, alias-tile matching,
and the controlled interior/border path shapes. Medium for the exact definition
of a "turn" at cells adjacent to the border.

The single mismatch at 38 remaining tiles is recorded as an unexplained
observation, but it is not sufficient evidence for a level-specific path rule.
An automation that enters the high-score or another modal screen will ignore
board clicks; check the screen state before treating a click as a path failure.

The dispatcher and sub-checker addresses are confirmed statically. The exact
corner/border predicate inside each sub-checker is still being read, but the
controlled accepted shapes agree with the two-turn model.

## Open questions

- Does a turn at the padded border count the same as a turn inside the board?
  Controlled border routes were accepted; no separate corner rule was found.
- Is a path allowed to pass through a cell whose `present` flag is zero but
  which is visually covered by another layer? The current evidence says the
  `present` flag is authoritative.
- What is the exact rejection animation when a non-matching pair is selected?

## Implementation impact

The current BFS in `src/core/board.ts` matches the confirmed cases, including
interior detours and border routes. Add right-click deselection at the UI
boundary. Do not add a level-specific exception for the unresolved level-2
click without a reproducible state trace.
