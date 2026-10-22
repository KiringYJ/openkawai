---
id: RE-0003
title: Pair score scales with level and each match adds four seconds of time
status: inferred
confidence: medium
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
8. Timer display at level 1 was approximately 224016 ms about one second after
   start. The cap is likely **225000 ms**, but a first-frame read is missing.

## Interpretation

The strongest supported model is:

```text
points_per_pair = 4 * level_number       # 4 on L1, 8 on L2 (confirmed for L2)
time_bonus_per_pair = 4000 ms
time_cap = 225000 ms                     # inferred
playfield = 16 x 9 = 144 tiles = 72 pairs
```

If the level multiplier continues, level 3 would award 12 points per pair and
level 11 would award 44. That is an extrapolation, not yet observed.

The clear/level bonus requires its own controlled run. The observed 548 at the
level-1 clear and 1448 at level-2 start imply a combined +1164 to +1160 over
the base pair score, but the event boundary is not proven.

## Confidence and limits

Confirmed: +4 on level 1, +8 on level 2, +4000 ms per match, 1000 ms/s decay,
72 pairs at the start of levels 1 and 2.

Inferred: 225000 ms cap, `4 × level` scoring, and the clear-bonus amount.

The automated timer patch means the recorded level-clear timer is not a clean
observation of the natural transition.

## Open questions

- What exactly produces the 284 → 548 jump at level-1 clear?
- What is awarded when the level-2 board reaches zero?
- Does the per-level score multiplier reset or compound across the 11 levels?
- Does the timer reset to a per-level maximum or carry over?
- What is the first-frame initial timer for each level and difficulty?

## Implementation impact

`src/game/session.ts` currently uses a flat 100/25 score model and a 5-minute
timer. Replace it with level-scaled pair points and a 225000 ms timer after the
clear-bonus experiments are complete.
