---
id: RE-0012
title: Chance stars trigger a 1-3 pick card screen; the 18 cards are a shuffled reward permutation
status: confirmed
confidence: high
target: KAWAI 連連看 2004 v1.01
environment:
  os: Windows 11 x64
  locale: zh-TW
evidence:
  - re/sessions/20261023-kawai2004-live-audit.md
  - re/sessions/20261022-kawai2004-runtime.md
  - re/sessions/20261023-kawai2004-chance-live.md
implementation:
  - src/game/session.ts
---

## Question

What exactly do chance stars do, how many cards can be picked, and what are
the card rewards?

## Method

Static disassembly of the match handler, card-screen initializer, and card-click
handler was combined with a controlled live run. The run read the chance kind,
set the star counter to 2, reduced the board to two chance-kind tiles, and
matched them. It then read the card array and clicked one card.

## Runtime addresses

| Address | Meaning |
| --- | --- |
| `0x41F0CC` | chance visual/match kind shown in `機會` |
| `0x41F0EA` | star count, 0-3 |
| `0x41F0CE` | card trigger, set to -1 when the third star is earned |
| `0x41F0E8` | card picks remaining for the current screen |
| `0x41F0DC` | pointer to 18 card records, 4 bytes each |

Each card record is `{u16 selected, u16 reward_code}`; selected is 0 or -1.
Chance kind is written at `0x408b9c` in the chance setup method `0x408b20`.

## Star trigger

At `0x40d6ab` the match handler compares the chance kind with the selected
cell's `match_id`. On a chance match it increments `0x41F0EA`; when the result
is at least 3 it writes `-1` to `0x41F0CE`. The same path then opens the card
screen.

The star increment is one per chance match. The chance kind itself is
re-selected by `0x408b20` at level start, **after every non-final match**
(both the move-exists branch at `0x40da58` and the auto-shuffle branch at
`0x40d9ff` call it), after a manual/auto shuffle, and after the card-screen
free shuffle. The star check uses the chance kind before that re-selection;
the panel then changes for the next board.

The re-selection samples the full 36-kind pool, not the remaining tiles. In a
controlled run with only kind 9 left, 12/12 post-match re-rolls chose a kind
that was absent from the board. The panel can therefore show an empty kind.

Stars are reset to 0 at `0x4152e2` when the card screen closes after the last
pick. The code checks `0x41F0E8` (picks remaining); while it is positive the
screen stays open, and when it reaches 0 the screen closes and stars are
cleared. Stars persist across level transitions until they are spent.

## Card picks

Before showing the screen, `0x40d704` builds a 10-entry table and chooses one
uniform index 0-9. The chosen value is the **number of cards the player may
pick**, stored at `0x41F0E8`.

| Difficulty | Table (ten entries) | P(1) | P(2) | P(3) |
| --- | --- | --- | --- | --- |
| 0 (弱) | 1,1,1,1,2,2,2,3,3,3 | 0.4 | 0.3 | 0.3 |
| 1 (強) | 1,1,1,1,1,1,2,2,2,3 | 0.6 | 0.3 | 0.1 |
| 2 (超強) | 1,1,1,1,1,1,1,2,2,3 | 0.7 | 0.2 | 0.1 |

The screen text `您還有 N 次 點選卡片機會` reflects this pick count.

## Card reward deck

The card initializer `0x40d230` creates the 18 card records and assigns a
**uniform random permutation of reward codes 0–17** to the 18 positions
(Fisher-Yates-style shuffle). A live read confirmed the 18 rewards were exactly
a permutation of 0–17.

The click handler at `0x41a450` applies the reward code through the jump table
at `0x41a7ac`:

| Codes | Effect |
| --- | --- |
| 0, 1, 2 | timer +10000 ms |
| 3, 4 | timer +15000 ms |
| 5 | timer +20000 ms |
| 6, 7, 8 | resource B +1 |
| 9, 10 | resource B +2 |
| 11 | resource B +3 |
| 12, 13, 14 | resource A +1 |
| 15, 16 | resource A +2 |
| 17 | resource A +3 |

The timer is frozen while the card screen is open (live: 203875 ms unchanged
over 3.2 s) and resumes on close. After a timer reward, the timer is capped at
the level maximum `0x41F184` (live: +10 s at 203875 → 213875; at 225000 it
stayed capped). A selected card gets `selected = -1`; picks is decremented. The
screen closes when picks reaches 0.

### Card-screen close

The close handler at `0x4152B3` checks the picks counter. When the last pick
closes the screen and tiles remain, it:

1. clears stars (`0x4152E2`);
2. runs the same ten-case level-transform dispatch used by the normal match
   path, through a second jump table at `0x415450` (RE-0018);
3. calls the shuffle `0x408C00` for free; it does not decrement B;
4. calls the chance setup `0x408B20`, which may select a new chance kind;
5. returns to play.

The shuffle preserves the occupied positions and permutes the remaining tile
identities, so the transform's hole pattern remains visible. If the board is
empty when the screen closes, the close path goes to the clear state instead of
shuffling.

Live isolation at level index 9 (L10): a hook on the shuffle entry
`0x408C00` captured the board after the transform and before the shuffle; all
ten present cells matched the predicted L10 (H-outward then V-outward)
transform. The subsequent close changed the board hash and chance kind.

## Live confirmation

```text
chance kind = 3
stars = 2                         (instrumented precondition)
match chance pair -> stars = 3, picks = 1
card rewards = permutation of 0..17
first card reward = 9             (resource B +2)
resource B 5 -> 7
stars later -> 0
```

The card screen opened while the board still had 2 tiles, so it is not tied to
a level clear. That two-tile case ends the board on the pick, so it does not
exercise the close shuffle; the 86-tile card-screen observation in the
2026-10-22 session is the relevant live case for the free shuffle.

## Interpretation

```text
on_chance_match:
  stars += 1
  if stars >= 3:
      picks = weighted_pick(difficulty)
      cards = shuffle_uniform(0..17)
      show_card_screen()

on_card_click(index):
  if picks > 0 and cards[index].selected == 0:
      apply_reward(cards[index].reward)
      cards[index].selected = -1
      picks -= 1
      if picks == 0:
          close_card_screen()
          stars = 0
          if remaining > 0:
              apply the level transform for the chance match
              free shuffle (no B cost)
              re-select the chance kind
```

The 18-card grid is a blind choice over a shuffled reward set; the visual card
position does not encode the reward.

## Confidence and limits

High for the reward table, pick-count distributions, shuffled permutation, and
star trigger: the jump table and initializer are explicit, and one live card
pick matched its pre-read reward code exactly.

Static control flow resolves the remaining edge cases: timer rewards are capped
at the level maximum `0x41F184`; multiple picks share the same click-handler
loop and the screen closes at zero; stars are reset at `0x4152E2` when the last
pick closes the screen; and the chance kind is written at `0x408B9C` on level
start, after every non-final match, after a manual/auto shuffle, and after the
card-screen free shuffle. The star check uses the pre-match kind. Only one pick
was exercised live, but it used the same handler.

Live checks: a non-chance match changed the chance kind from 26 to 3; forcing
the chance kind to the hint pair's kind 16 produced a third star, the card
screen with picks=1, and a full 0–17 reward permutation. A controlled clear
with stars=2 followed by Continue left stars=2 on level 2, confirming that
stars survive a level transition; they reset only on the card-screen close and
on a new game.

Card-pick samples: 弱 = 2, 強 = 1 and 2, 超強 = 1; all fall inside the static
ten-entry tables. The timer froze at 203875 ms for 3.2 s while the screen was
open, and a +10 s card raised it to 213875; at the 225000 cap it stayed 225000.

High for the card-close side effects: the second level-transform dispatch table
at `0x415450` and the unconditional `0x408C00`/`0x408B20` calls are explicit.
The live 86-tile board after the card screen is consistent with a shuffle that
preserves the occupied positions.

## Resolved edge cases

- A failed round returns to the menu; the next new game writes stars = 0 at
  `0x4199a6`, so no carried star state survives into a new game.
- Multiple picks use the same click-handler loop: each unselected card applies
  one reward, decrements picks, and the screen closes when picks reaches 0.
  The one-pick probe exercises the same handler path.

## Implementation impact

Model `chanceKind`, `stars`, a card-screen state, `picks`, and an 18-card
shuffled reward deck. Use the seedable RNG for the shuffle and pick table; do
not hardcode a single 900-point card reward. Card rewards affect only time and
the two resources. On the last pick with tiles remaining, apply the deferred
level transform (RE-0018), then shuffle for free, then re-select the chance
kind; do not consume B for this shuffle.
