---
id: RE-0008
title: Match score and timer follow a closed-form difficulty/level formula; per-level time limits decay linearly
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
  - src/content/layouts.ts
---

## Question

What are the exact score gain, timer gain, and initial time limit for a match
on each difficulty and level?

## Method

The closed-form branches are in `0x40d430` (the match-completion path). The
level timer setup is in `0x40dad0`. Both were disassembled with Capstone from
the unpacked target, and the observed level-1 results were checked against the
live game.

## Observations

### Difficulty enum

The menu option handlers write `0x41f180`:

| Menu label | Value | Address |
| --- | --- | --- |
| 弱 | 0 | `0x419ab0` |
| 強 | 1 | `0x419ae5` |
| 超強 | 2 | `0x419b1b` |

### Match score

At `0x40d473` the match path branches on `0x41f180`:

```text
difficulty 0:  gain = (0 + 1) * (level_index + 1)       = level_index + 1
difficulty 1:  gain = (1 + 1) * (level_index + 1) * 2   = 4 * (level_index + 1)
difficulty 2:  gain = (2 + 1) * (level_index + 1) * 3   = 9 * (level_index + 1)
```

Equivalently:

```text
score_gain = (difficulty + 1)^2 * (level_index + 1)
```

The observed level-1/difficulty-1 gain of **+4** and the level-2/difficulty-1
gain of **+8** match this formula exactly.

### Match timer bonus

The same three branches add:

| Difficulty | Timer added |
| --- | --- |
| 0 (弱) | `0x1770` = 6000 ms |
| 1 (強) | `0x0fa0` = 4000 ms |
| 2 (超強) | `0x0bb8` = 3000 ms |

After the addition, `0x40d5a7` compares the result with `0x41f184` and caps the
timer at that maximum.

### Initial time limit

`0x40dad0` computes the initial limit from the **level index** at `0x41f166`
and difficulty at `0x41f180`:

| Difficulty | Formula (seconds) | Level 1 | Level 2 | Level 11 (if index 10) |
| --- | --- | --- | --- | --- |
| 0 (弱) | `320 - 20 * level_index` | 320 | 300 | 120 |
| 1 (強) | `225 - 15 * level_index` | 225 | 210 | 75 |
| 2 (超強) | `160 - 10 * level_index` | 160 | 150 | 60 |

The result is multiplied by 1000 and stored at `0x41f184` and `0x41f1b4`.
This reproduces the observed level-1/difficulty-1 **225000 ms** initial timer.

### Level index

`0x41f166` is the **zero-based level index**, not a simple new-round flag:

- level 1 starts at 0;
- it is incremented when a card/next-level path is taken
  (`0x41a299` → `0x41a2a4`, and `0x41a351` → `0x41a361`);
- the score formula multiplies by `level_index + 1`;
- the dispatcher resets score/resources only when the index is 0.

The live level-1 read `0x41f166 = 0` and the later post-clear read
`0x41f166 = 1` are consistent with this interpretation.

## Interpretation

The rule model is:

```text
score_gain = (difficulty + 1)^2 * (level_index + 1)
timer_gain_ms = [6000, 4000, 3000][difficulty]
timer = min(timer + timer_gain_ms, level_time_limit_ms)
level_time_limit_ms = [320 - 20*i, 225 - 15*i, 160 - 10*i][difficulty] * 1000
```

The score is therefore not `4 × level`; the previous implementation's
`4 × level` was only the difficulty-1 special case.

## Confidence and limits

High for the formulas and the difficulty enum; the level-1 and level-2
difficulty-1 score values were observed live, and the formulas reproduce them.

Observed live at all three difficulties: the level-1 maximum timers
(320000/225000/160000 ms), the starting resources (8/8 at 弱, 5/5 at 強 and
超強), and the first-pair score gains (+1/+4/+9). Below-cap live tests also
measured the match bonus: 弱 300000 → 305375 (+5375 net), 超強 150000 → 152390
(+2390 net), consistent with 6000/3000 ms minus elapsed time. The per-level
timer subtraction at difficulty 0 and 2 is still from the level-start assembly
except for the level-1→2 continuation, where 弱 gave 300000 ms and 超強
150000 ms.

## Open questions

- The level count is resolved in RE-0011: 11 levels, index 0–10.
- Does difficulty 0/2 use the same linear timer formulas? The level-start
  assembly says yes, and the level-1 maxima were observed live at 320000 and
  160000 ms; the full 11-level sweep was run at difficulty 1 only.
- What happens if the level index exceeds 10? The final-level branch handles
  index 10 with state 3, so no normal continuation should occur.

## Implementation impact

Replace the provisional flat timer and `4 * level` score with the formulas
above. Keep the timer cap per level and expose difficulty in `GameSession`.
