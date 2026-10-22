# Kawai2004 v1.01 gameplay ruleset

This is the implementation-oriented summary of the confirmed rules. Detailed
evidence lives in `re/findings/RE-0001` through `RE-0016` and the runtime
session log.

## Board

- Logical array: 18 columns × 11 rows, 6-byte cells.
- Playable area: columns 1–16, rows 1–9 (144 cells).
- Cell fields: `u16 present` (`0xFFFF` present, 0 empty), `u16 visual_id`,
  `u16 match_id`.
- All 11 levels and all three difficulties start with the same multiset:
  - visual IDs 0–33, four tiles each (136);
  - visual IDs 34–41, one tile each (8).
- Normal tiles match by `visual_id`/`match_id`. The eight specials match by
  `match_id` groups 34 and 35 (four visual variants each).
- The initial deal is a random permutation of this multiset and always fills
  all 144 cells.
- Shuffle preserves the remaining multiset and rearranges positions.

## Matching and path

- Select two present tiles with equal `match_id`.
- The path is orthogonal, cannot pass through another present tile, and may
  use the one-cell outer border.
- Maximum two direction changes.
- Left click selects; right click cancels the current selection.
- The path checker dispatcher is `0x40b610`; sub-checkers are `0x40b6e0`
  (same row), `0x40baa0` (same column), `0x40be60`/`0x40c830` (mixed row and
  column).
- A legal pair removes both tiles and decrements the remaining counter by 2.

## Levels

| Level | Index | Name | Difficulty-1 max time |
| --- | --- | --- | --- |
| 1 | 0 | 第01關 一板一眼 | 225 s |
| 2 | 1 | 第02關 石沉大海 | 210 s |
| 3 | 2 | 第03關 撥雲見日 | 195 s |
| 4 | 3 | 第04關 開天闢地 | 180 s |
| 5 | 4 | 第05關 左右開弓 | 165 s |
| 6 | 5 | 第06關 上下同心 | 150 s |
| 7 | 6 | 第07關 左右逢源 | 135 s |
| 8 | 7 | 第08關 上天入地 | 120 s |
| 9 | 8 | 第09關 失之交臂 | 105 s |
| 10 | 9 | 第10關 四大皆空 | 90 s |
| 11 | 10 | 第11關 萬佛朝宗 | 75 s |

Per-level max time in seconds:

```text
difficulty 0: 320 - 20 * level_index
difficulty 1: 225 - 15 * level_index
difficulty 2: 160 - 10 * level_index
```

Level 1 starts with resources A=5 (hint) and B=5 (shuffle). Every continuation
adds +1 to both counters. The level index is stored at `0x41F166`.

## Score and timer

Let:

```text
G = (difficulty + 1) * (level_index + 1)
```

- Pair score: `(difficulty + 1) * G` (level 1 / difficulty 1 = 4;
  level 2 / difficulty 1 = 8; difficulty 2 / level 1 = 9).
- Match time: difficulty 0 = 6000 ms, difficulty 1 = 4000 ms,
  difficulty 2 = 3000 ms.
- The timer is capped at the current level maximum.
- Natural timer decay is 1000 ms per second.

On the final pair, after the pair score and match time:

```text
base_clear = 50 * G
tick_gain  = 2 * G
clear_bonus = base_clear + tick_gain * floor((timer - 1) / 1000)
timer = 0
```

The clear animation counts the score up; use the final overlay score.

The level-11 clear additionally applies:

```text
(resourceA + 1) * (difficulty + 1) * 100
+ (resourceB + 1) * (difficulty + 1) * 100
+ (difficulty + 1) * 5000
```

then sets resources to 0 and enters the completed state.

## Resources

- Resource A (`0x41F1AC`) = hint; right blue icon; one use costs 1.
- Resource B (`0x41F1AE`) = shuffle; left orange circular-arrow icon; one use
  costs 1.
- Hint sets `0x41F158 = -1` and highlights the most recent legal pair found by
  the move finder (`0x41F15A/15C` = column,row of endpoint 1;
  `0x41F15E/160` = endpoint 2).
- The hint does not recompute on click. The move finder refreshes at level
  start, after a match, and after a shuffle.
- If no legal move remains after a match: consume one B and shuffle if B > 0;
  otherwise the no-move failure branch runs (state 2, `0x41F188=3`). The
  branch is confirmed statically; the artificial-board live probe did not
  reproduce a normal post-match no-move state.

## Chance stars and cards

- Chance kind (`0x41F0CC`) is fixed for a board between shuffles; it is set by
  `0x408b20` at level start and after shuffles.
- Matching a pair of the chance kind increments stars (`0x41F0EA`).
- Three stars set the card trigger and open the card screen.
- Picks are chosen from a ten-entry table by difficulty:
  - 弱: 1,1,1,1,2,2,2,3,3,3
  - 強: 1,1,1,1,1,1,2,2,2,3
  - 超強: 1,1,1,1,1,1,1,2,2,3
- The 18 cards hold a shuffled permutation of reward codes 0–17:
  - 0–2: +10 s
  - 3–4: +15 s
  - 5: +20 s
  - 6–8: shuffle B +1
  - 9–10: shuffle B +2
  - 11: shuffle B +3
  - 12–14: hint A +1
  - 15–16: hint A +2
  - 17: hint A +3
- Timer rewards are capped at the level maximum.
- The card screen closes when picks reach 0, then stars reset to 0.

## Flow

```text
menu -> level start -> playing
playing -> final pair removed -> clear overlay (score count-up)
clear overlay click -> next level, score kept, +1/+1 resources
level 11 clear -> final resource bonus -> completed
timer 0 or no-move failure -> failure overlay -> name entry (if qualifying)
-> write active high-score table -> menu
```

## High score file

- Path: `\kawai2004.hst` under the Windows directory; UAC virtualization may
  place it under `VirtualStore\Windows`.
- Size: 660 bytes.
- Three contiguous difficulty tables × ten entries × 22 bytes:
  - `name[16]` space-padded
  - `score u32`
  - `level u16` (zero-based)
- Difficulty 1 (強) uses entries 10–19. Scores are sorted descending and
  newly entered scores shift later entries down.
- The file is written immediately after Enter on the name screen.
- The name-entry screen shows the current run's score provisionally at its
  rank; this is not a stored default row. The `最佳記錄` screen reads only
  persisted entries (24/4 in the observed file, with no extra 100).

## Out of scope / nondeterministic

- The exact VB `Rnd` seed and permutation sequence are not fixed game rules;
  use a seedable RNG and a uniform permutation for a compatible clone.
- Original artwork, audio, fonts, and binaries remain outside the repository
  under the clean-room policy.
- Synthetic keyboard events produced a different name spelling (`UGVX` instead
  of `TEST`); this is an input-injection detail, not a game rule.
