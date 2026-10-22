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
  - re/sessions/20261022-kawai2004-runtime.md
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
Chance kind is written at `0x408b9c` in the level setup method `0x408b20`.

## Star trigger

At `0x40d6ab` the match handler compares the chance kind with the selected
cell's `match_id`. On a chance match it increments `0x41F0EA`; when the result
is at least 3 it writes `-1` to `0x41F0CE`. The same path then opens the card
screen.

The star increment is one per chance match. The chance kind is written only
at `0x408b9c` inside `0x408b20`; that method runs at level start and after a
shuffle, so the chance kind is fixed for a board between shuffles.

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

After a timer reward, the timer is capped at the level maximum `0x41F184`.
A selected card gets `selected = -1`; picks is decremented. The screen closes
when picks reaches 0.

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
a level clear.

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
```

The 18-card grid is a blind choice over a shuffled reward set; the visual card
position does not encode the reward.

## Confidence and limits

High for the reward table, pick-count distributions, shuffled permutation, and
star trigger: the jump table and initializer are explicit, and one live card
pick matched its pre-read reward code exactly.

Not yet observed live: timer-reward caps at different levels, multiple picks in
one screen, star reset timing, and whether the chance kind can change within a
level.

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
the two resources.
