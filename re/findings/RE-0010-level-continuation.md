---
id: RE-0010
title: Continuing past the clear overlay advances the level, resets the timer, and adds one hint (and one shuffle except at 弱) without changing score
status: confirmed
confidence: high
target: KAWAI 連連看 2004 v1.01
environment:
  os: Windows 11 x64
  locale: zh-TW
evidence:
  - re/sessions/20261023-kawai2004-live-audit.md
  - re/sessions/20261022-kawai2004-runtime.md
  - re/sessions/20261023-kawai2004-continuation-resources.md
implementation:
  - src/game/session.ts
---

## Question

What happens when the player clicks the `恭喜過關` overlay to continue?

## Method

A controlled level-1 clear (RE-0009) left the game in state 2 with score 156,
remaining 0, timer 0, level index 0, and resources 5/5. A click at client
`(400, 290)` inside the overlay was sent, then all live fields were read again.

## Observations

Before the click:

```text
score=156  level=0  remaining=0  timer=0  state=2  resA=5  resB=5
```

After the click and one second:

```text
score=156  level=1  remaining=144  timer=208953  state=0  resA=6  resB=6
max_timer=210000
```

The level-2 maximum is exactly the RE-0008 formula
`225 - 15*1 = 210` seconds. The score did **not** change. Both resource counts
increased by one. A second controlled continuation from a level-2 clear gave
level index 2, maximum timer 195000 ms, and resources 7/7, again with the score
unchanged (1988).

Static decoding of the continuation block at `0x41a344` adds one nuance: it
always increments resource A, but increments resource B only when
`difficulty > 0`. At difficulty 0 (弱), B stays at its current value across a
continuation; A still rises. The live +1/+1 observations above were at
difficulty 1.

Live difficulty sweep: 弱 level 1 → 2 gave A 8→9, B 8→8, max timer 300000,
score 63; 超強 level 1 → 2 gave A/B 5→6/6, max timer 150000, score 177.
Level index advanced to 1 in both cases.

## Interpretation

The continuation path is:

```text
advance_level:
  level_index += 1
  remaining = 144
  timer = level_time_limit(level_index, difficulty)
  resourceA += 1
  if difficulty > 0:
      resourceB += 1
  state = playing
  score unchanged
```

This path does not change the score. The earlier natural `548 → 1448` jump is
the level-clear score count-up itself: the log read 548 while the clear
animation was still running, and the final overlay showed 1448. Card rewards
(RE-0012) affect only time and resources, not score.

## Confidence and limits

High for the level-1 → level-2 continuation at all three difficulties:
difficulty 1 gave 5/5 → 6/6, 弱 gave 8/8 → 9/8, 超強 gave 5/5 → 6/6, all with
the score carried and the next timer limit applied. The `JLE` at `0x41a36e`
and the live 弱 case agree on the B-skip.

A sweep confirmed the path through levels 1–10 at difficulty 1; level 11 ends
in state 3 without a continue (RE-0011).

## Open questions

- Does difficulty 0 give the same +1/+1 resource increment? No: live A 8→9,
  B 8→8; 強 and 超強 both increment A and B.
- Does the card screen ever appear during a continuation rather than during
  active play? No; it is triggered by the third chance star during play
  (RE-0012), and continuation starts a fresh level.

## Implementation impact

Model continuation separately from clear-time scoring. Increment the level
index, apply the per-level timer, increment resource A, and increment resource B
only when `difficulty > 0`; keep the score. Do not add a fixed score on
continue. Stop at level index 10 with a completed state instead of offering
another continuation.
