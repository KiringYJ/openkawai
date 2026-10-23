---
id: RE-0009
title: Level clear converts remaining time into score and adds a level/difficulty-scaled base bonus
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

What exactly happens to the score when the last pair is removed?

## Method

A fresh level-1 game at difficulty 1 (`強`) was instrumented read/write. All
playable cells except one adjacent matching pair were cleared in the live board
array, the remaining counter was set to 2, and the timer was set to a known
value before clicking the pair. The score was polled immediately after the
click.

This bypasses the normal path to the last pair but enters the same last-pair
and level-clear branches; the probe only changes preconditions, not the clear
routine.

## Observations

| Level / difficulty | Timer before final pair | Score after clear | Timer after | State `0x41f164` |
| --- | --- | --- | --- | --- |
| L1 / 1 | 1000 ms | **120** | 0 | 2 |
| L1 / 1 | 10000 ms | **156** | 0 | 2 |
| L2 / 1 | 200000 ms | **1988** (final overlay) | 0 | 2 |

The level-2 probe started at score **156**, matched a visual-13 chance pair as
the last pair, and produced a final score of **1988**:

```text
156 + 8 (final pair) + 200 (base) + 8*203 (time ticks) = 1988
```

The timer after the final match was 204000 ms (200000 + 4000, below the
210000 ms level cap), so 203 positive 1000 ms ticks remain before the final
tick reaches zero. The score visibly **counts up** during the clear animation
(an intermediate read was 1156), so observations must use the overlay's final
score, not a sample taken immediately after the click.

The final pair itself awards the normal **+4** at level 1 / difficulty 1.
The clear routine then drains the timer in 1000 ms ticks and adds score. The
observed totals decompose exactly as:

```text
T_after_match = T_before + 4000 ms       (normal match bonus, capped by max)

score += 4                               (final pair)
score += 100                             (base clear bonus)
score += 4 * floor((T_after_match - 1) / 1000)
```

- T=1000 → T_after_match=5000 → 4 + 100 + 4*4 = **120**.
- T=10000 → T_after_match=14000 → 4 + 100 + 4*13 = **156**.

The number of positive time ticks is `floor((T-1)/1000)`: the routine subtracts
1000, awards the tick when the result is still positive, and awards the base
bonus on the final tick that reaches zero.

## General formula

Let:

```text
G = (difficulty + 1) * (level_index + 1)
pair_gain = (difficulty + 1) * G
base_clear = 50 * G
tick_gain = 2 * G
```

After the final pair has been scored and its +4000 ms (or difficulty-dependent
match bonus) applied, the clear routine adds:

```text
score += base_clear + tick_gain * floor((T - 1) / 1000)
timer = 0
state = 2
```

At level 1 / difficulty 1, `G=2`, so `base_clear=100`, `tick_gain=4`, which
matches both probes and the earlier natural **284 → 548** jump if about
42 seconds remained at clear (`100 + 4*41 = 264`).

## Final-level branch

The same routine checks whether the level index is at least 10. If so, after
the clear bonus it also adds resource bonuses and sets state 3:

```text
score += (resourceA + 1) * (difficulty + 1) * 100
score += (resourceB + 1) * (difficulty + 1) * 100
score += (difficulty + 1) * 5000
resourceA = 0
resourceB = 0
state = 3
```

This branch was reproduced live at the end of the RE-0011 level sweep:
level 11, difficulty 1, resources 15/15, final score 24320, state 3. A
difficulty-2 level-11 probe with resources 15/15, timer 1000 ms produced
**26547** and state 3, matching the predicted pair + clear + resource bonus.
A difficulty-0 level-11 probe with resources 18/8 and timer 1000 ms produced
**8493**, resources 0, and state 3 in the 2026-10-23 live audit.

## Confidence and limits

High for the clear formula at all three difficulties: controlled level-1
clears with timer 1000 ms produced 弱 = 63, 強 = 120, 超強 = 177; the 強
10000 ms case produced 156; the 強 level-2 case produced 1988. All match the
`G` formula exactly.

The final-level resource bonus was reproduced live at all three difficulties;
the difficulty-0 and difficulty-2 results are recorded in the live audit.

The probe forces the board to a final pair. It does not change the clear
routine. The 548 → 1448 jump is this clear count-up completing; card rewards
(RE-0012) affect only time/resources, and continuation adds no score (RE-0010).

## Open questions

- Is the final-level resource bonus confirmed live at all three difficulties?
  Yes: difficulty 1 in RE-0011, and difficulties 0/2 in the live audit.
- Do difficulty 0/2 produce the exact predicted clear totals live? Yes:
  63 and 177 at level 1 with 1000 ms; see above.

## Implementation impact

`GameSession` should keep the timer in milliseconds, award the normal pair
score, then on `remaining == 0` drain the timer and add the clear bonus. Do not
treat the 284 → 548 jump as an unexplained constant.
