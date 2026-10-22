---
id: RE-0003
title: Pair score, timer, and level-flow observations (formula superseded by RE-0008)
status: superseded
confidence: medium
superseded_by: RE-0008
target: KAWAI 連連看 2004 v1.01
environment:
  os: Windows 11 x64
  locale: zh-TW
evidence:
  - re/sessions/20261022-kawai2004-runtime.md
implementation:
  - src/game/session.ts
  - src/content/layouts.ts
---

## Question

What are the score, timer, and level-transition rules?

## Method

Observed the live score (`0x0041F140`), remaining-tile counter
(`0x0041F13C`), and timer (`0x0041F1B4`) before and after controlled clicks.
Natural timer decay was measured without instrumentation; automated clearing
used a 200000 ms timer patch to prevent incidental expiry.

## Observations

1. Natural timer decrease: 2000 units over 2 seconds, i.e. **1000 units per
   second**. The field is milliseconds.
2. Level 1, first pair: score 0 → 4.
3. Level 1, later pairs: score 4 → 8, 8 → 12, 12 → 16; every normal pair
   added exactly **4 points**.
4. Level 2, first observed pair (Spearow/visual 6): score 1448 → 1456, i.e.
   **+8**. A Rapidash pair then scored 1456 → 1464, again **+8**.
5. Timer bonus: matches raised the timer by approximately **4000 ms** after
   subtracting the observation window:
   - +3922 ms observed with 94 ms elapsed → ~4016 ms bonus;
   - +3937 ms observed with 84 ms elapsed → ~4021 ms bonus;
   - +3656 ms observed with 343 ms elapsed → ~3999 ms bonus.
   The first level-1 match raised the timer only 547 ms because the timer was
   near its cap.
6. Level-1 clear sequence:
   - 284 points after the penultimate pair;
   - 284 → 548 on the final pair (remaining 2 → 0);
   - 1448 at the start of level 2.
   The exact split between a final-pair bonus, a clear bonus, and a
   next-level award is not isolated.
7. Level 1 loaded with 144 tiles; level 2 also loaded with 144 tiles.
8. The level-start dispatcher `0x40dad0` computes
   `timer_ms = [0x41f184] * 1000` and writes it to `0x41f1b4`. On a fresh
   level 1, `0x41f184` was **225000**, so the initial timer is exactly
   **225.000 seconds**. A live read about one second after start showed
   `224016 ms`, consistent with decay.
9. At the same level-1 start, the difficulty word `0x41f180` was `1` and the
   two resource words `0x41f1ac`/`0x41f1ae` were both `5`, matching the HUD
   `005` / `005`. The dispatcher's assembly branches to `8` for difficulty
   value 0 and `5` for values 1 or 2.

## Interpretation

The observations are retained as raw evidence, but the `4 × level` model was
a difficulty-1 special case. **RE-0008** derives the exact formula from the
match and level-start assembly:

```text
score_gain = (difficulty + 1)^2 * (level_index + 1)
time_bonus_ms = [6000, 4000, 3000][difficulty]
level_time_limit_ms = [320 - 20*i, 225 - 15*i, 160 - 10*i][difficulty] * 1000
```

At difficulty 1 this gives +4 on level 1 and +8 on level 2, matching every
measured pair. **RE-0009** resolves the clear jump: the clear routine drains
remaining time into score and adds a base bonus. The observed 284 → 548 jump
(264 points) is `100 + 4*41`, consistent with about 42 seconds remaining.
The later 548 → 1448 jump is the same clear count-up finishing: the log read
548 mid-animation, and 900 = 100 + 4*200. Card rewards do not add score
(RE-0012).

## Confidence and limits

Confirmed: +4 on level 1, +8 on level 2, +4000 ms per match, 1000 ms/s decay,
72 pairs at the start of levels 1 and 2, and a 225000 ms level-1 initial
timer. At difficulty value 1, both HUD resources started at 5.

Superseded: the `4 × level` scoring interpretation and the flat timer; see
RE-0008. Clear scoring is resolved in RE-0009, continuation in RE-0010, and
the 11-level table in RE-0011. The 548 → 1448 jump is the clear count-up
finishing, not a next-level score bonus.

The automated timer patch means the recorded level-clear timer is not a clean
observation of the natural transition.

## Open questions

- Does a natural timer expiry use a different overlay or penalty than a clear?

## Implementation impact

Use the RE-0008 formulas in `src/game/session.ts`; do not implement `4 × level`
or a flat five-minute timer.
