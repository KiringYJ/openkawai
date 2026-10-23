---
id: RE-0004
title: The chance tile is a visual tile kind; three stars open an 18-card resource bonus
status: superseded
confidence: medium
superseded_by: RE-0012
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

How do the opportunity/chance tile, stars, and resource replenishment screen
work?

## Method

Captured the right-hand `機會` panel before and after matches, identified its
sprite against the tile atlas, and matched pairs of that visual kind. Observed
the three-star HUD and the card screen, then clicked a card and returned to the
board.

## Observations

1. The `機會` panel displays a normal tile sprite. On level 1 the icon was
   Psyduck; on the level-2 probe it was Rapidash (visual ID 13).
2. Matching a Rapidash pair on level 2 changed the HUD stars from one to two.
   The score also increased by 8, so the star did not replace the normal pair
   score.
3. Matching a Spearow pair (visual ID 6) scored +8 but did not change the
   stars. The icon at that moment was Rapidash, not Spearow. This shows the star
   is tied to the **displayed chance kind**, not to any pair.
4. After three stars, the game opened a screen with the text
   `您還有 1 次 點選卡片機會` ("you have 1 chance to click a card") and a
   6 × 3 grid of face-down KAWAI cards.
5. A card click returned to the board and changed the top-right resource
   display. The immediate screenshot still showed three stars; a later
   controlled read (RE-0012) showed stars reset to 0 when the screen closed, so
   the screenshot caught the pre-reset frame.
6. Returning to the board preserved the remaining tile set; the board was
   reshuffled into the same occupied positions (a free immediate reshuffle,
   consistent with the README). RE-0012 confirms the occupied positions are
   preserved and only tile identities are permuted.

## Interpretation

The chance feature is a **moving target tile kind**:

```text
chance_visual_id = sprite shown in the 機會 panel
match a pair of chance_visual_id -> +1 star
three stars -> resource card screen
```

The match must use the visual kind shown at the time, not the alias
`match_id` groups 34/35. Stars persist at least across a level transition and
across the card bonus in the observed run.

The card screen's card count was 18; the observed chance count was 1. The
exact pick distribution and reward table are resolved in **RE-0012**. The
`1 次` text is the number of card picks, not a fixed property of the screen.

## Confidence and limits

Confirmed: the icon is a normal tile sprite, matching that sprite grants a
star (Rapidash → two stars), and three stars open the card screen.

Resolved by RE-0012: the chance kind is re-selected after every non-final
match, stars reset on the card-screen close and on a new game, and the 18-card
reward table is a shuffled permutation of codes 0–17. The pick count varies by
difficulty, not by level or stars.

## Open questions

All superseded by RE-0012/RE-0018:

- When exactly does the chance icon change? At level start, after every
  non-final match, after a manual or auto shuffle, and after the card-screen
  free shuffle; not on pause resume.
- Does a star match require both tiles to be the chance visual, or only one?
  Both tiles match each other by `match_id`, so both are the chance kind.
- Are stars reset after the card screen, a level clear, or a failed round? The
  last card pick resets them; a new game also resets them. They persist across
  level transitions until spent.
- What are the 18 card rewards and their probabilities? RE-0012: a shuffled
  permutation of fixed time/resource effects, selected by pick count.
- Does the free reshuffle preserve the remaining tile count and only permute
  positions? Yes: it preserves the occupied positions and the multiset, and
  permutes tile identities without consuming B.

## Implementation impact

`src/game/session.ts` has no chance/star model. Add `chanceKind`, `stars`, and
a separate bonus-screen state; do not conflate the chance kind with the alias
match groups 34/35.
