---
id: RE-0010
title: Continuing past the clear overlay advances the level, resets the timer, and adds one to each resource without changing score
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

## Interpretation

The continuation path is:

```text
advance_level:
  level_index += 1
  remaining = 144
  timer = level_time_limit(level_index, difficulty)
  resourceA += 1
  resourceB += 1
  state = playing
  score unchanged
```

This path does not change the score. The earlier natural `548 → 1448` jump is
the level-clear score count-up itself: the log read 548 while the clear
animation was still running, and the final overlay showed 1448. Card rewards
(RE-0012) affect only time and resources, not score.

## Confidence and limits

High for the observed level-1 → level-2 continuation at difficulty 1, including
the no-score-change behavior and the +1/+1 resources.

The resource increment condition at difficulty 0 has not been checked live.
A sweep confirmed the path on levels 1 through 10; level 11 ends in state 3
without a continue (RE-0011).

## Open questions

- Does difficulty 0 give the same +1/+1 resource increment?
- Does the card screen ever appear during a continuation rather than during
  active play?

## Implementation impact

Model continuation separately from clear-time scoring. Increment the level
index, apply the per-level timer, and increment both resources; keep the score.
Do not add a fixed score on continue. Stop at level index 10 with a completed
state instead of offering another continuation.
