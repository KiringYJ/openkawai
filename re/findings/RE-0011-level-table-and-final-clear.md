---
id: RE-0011
title: The game has 11 full 16x9 levels with a linear timer/resource table and a final resource-based clear bonus
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
  - src/content/layouts.ts
---

## Question

How many levels are there, what are their starting timers/resources, and what
happens on the final clear?

## Method

A controlled sweep started from level 1, captured the initial board, reduced
the board to one legal pair, cleared it with a 1000 ms timer, and continued.
The process was repeated for all 11 levels. Raw boards and screenshots are in
the untracked `re/.local/evidence/levels/` directory.

## Observations

- The game has **11 levels**, with zero-based level index 0 through 10.
- Every level starts with **144 present tiles** on the full 16 × 9 playfield.
- The level-1 difficulty-1 maximum timer is 225000 ms; each level subtracts
  15000 ms: 225, 210, 195, …, 75000 ms at level 11.
- At difficulty 1, both resource counters start at 5/5 on level 1 and increase
  by one per level: 5/5, 6/6, …, 15/15 at level 11.
- Continuing a clear adds no score and starts the next level with its own
  timer and incremented resources. At difficulty 0 the starting pair is 8/8;
  continuation still raises hint A but leaves shuffle B unchanged (RE-0010).
- A clear with 1000 ms remaining before the final pair produced cumulative
  scores:

  | Level | Index | Name | Score after clear |
  | --- | --- | --- | --- |
  | 1 | 0 | 第01關 一板一眼 | 120 |
  | 2 | 1 | 第02關 石沉大海 | 360 |
  | 3 | 2 | 第03關 撥雲見日 | 720 |
  | 4 | 3 | 第04關 開天闢地 | 1200 |
  | 5 | 4 | 第05關 左右開弓 | 1800 |
  | 6 | 5 | 第06關 上下同心 | 2520 |
  | 7 | 6 | 第07關 左右逢源 | 3360 |
  | 8 | 7 | 第08關 上天入地 | 4320 |
  | 9 | 8 | 第09關 失之交臂 | 5400 |
  | 10 | 9 | 第10關 四大皆空 | 6600 |
  | 11 | 10 | 第11關 萬佛朝宗 | 24320, state 3 |

  The names are transcribed from the captured level screenshots in
  `re/.local/evidence/levels/`.

  Each non-final clear increment is `120 * (level_index + 1)` at difficulty 1
  with a 5-second post-match timer: pair `4*(i+1)`, base `100*(i+1)`, and time
  `4*4*(i+1)`. The observed cumulative values match exactly.

## Final clear

At level 11, index 10, the clear adds the normal final-pair and time bonuses
and then the final resource bonus from RE-0009:

```text
score += (resourceA + 1) * (difficulty + 1) * 100
score += (resourceB + 1) * (difficulty + 1) * 100
score += (difficulty + 1) * 5000
```

With A=B=15 and difficulty 1:

```text
normal L11 clear: 44 pair + 1100 base + 4*44 time = 1320
resource bonus:   16*2*100 + 16*2*100 + 2*5000 = 16400
previous score:   6600
total:            6600 + 1320 + 16400 = 24320
```

The live final score was exactly **24320**, and `0x41f164` became **3**
(game-complete state). There is no next-level continue on this path.

## Confidence and limits

High for the level count, initial full-board size, timer table, resource table,
and final score arithmetic at difficulty 1.

The 11 captured boards all have 36 visible kinds ×4 and the same eight alias
IDs (RE-0001). The chance kind and level-specific arrangement are covered by
RE-0012/RE-0018. Difficulty 0 and 2 should also be swept to confirm the timer
and final resource formulas.

## Open questions

- Are the level layouts fixed or randomly shuffled each run? The multiset and
  full 144-cell fill are fixed; the initial deal is a random permutation
  (RE-0001), not a fixed pattern.
- Does difficulty change only the timer/scores/resources, or also the board?
  The starting multiset is invariant at difficulty 0/1/2 (RE-0001/RE-0011); the
  difficulty changes timer, score, starting resources, and card picks.
- What are the 11 level names and backgrounds? The names are captured in the
  table above; backgrounds are original art and remain outside the clean-room
  ruleset.

## Implementation impact

Implement an 11-entry level table with the timer formulas and starting
resources. The final level must apply the resource bonus and enter a completed
state instead of offering a continue.
