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
   display. The three stars remained filled after the card screen.
6. Returning to the board preserved the remaining tile set; the board was
   reshuffled into empty positions (a free immediate reshuffle, consistent
   with the README).

## Interpretation

The chance feature is a **moving target tile kind**:

```text
chance_visual_id = sprite shown in the 機會 panel
match a pair of chance_visual_id -> +1 star
three stars -> resource card screen
```

The match must use the visual kind shown at the time, not the special
`match_id` groups 34/35. Stars persist at least across a level transition and
across the card bonus in the observed run.

The card screen's card count was 18; the observed chance count was 1. The
exact pick distribution and reward table are resolved in **RE-0012**. The
`1 次` text is the number of card picks, not a fixed property of the screen.

## Confidence and limits

Confirmed: the icon is a normal tile sprite, matching that sprite grants a
star (Rapidash → two stars), and three stars open the card screen.

Medium: whether the chance kind changes after every match, every star, or on a
timer; whether stars reset after the card screen; and the exact card reward
table. The card screen's `1 次` may vary with level or stars.

## Open questions

- When exactly does the chance icon change?
- Does a star match require both tiles to be the chance visual, or only one?
- Are stars reset after the card screen, a level clear, or a failed round?
- What are the 18 card rewards and their probabilities?
- Does the free reshuffle preserve the remaining tile count and only permute
  positions?

## Implementation impact

`src/game/session.ts` has no chance/star model. Add `chanceKind`, `stars`, and
a separate bonus-screen state; do not conflate the chance kind with the
special match groups 34/35.
