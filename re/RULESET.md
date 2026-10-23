# Kawai2004 v1.01 gameplay ruleset

This is the implementation-oriented summary of the confirmed rules. Detailed
evidence lives in `re/findings/RE-0001` through `RE-0019`, the session logs, and
the static/live claim matrix in [`AUDIT.md`](AUDIT.md).

## Board

- Logical array: 18 columns × 11 rows, 6-byte cells.
- Playable area: columns 1–16, rows 1–9 (144 cells).
- Cell fields: `u16 present` (`0xFFFF` present, 0 empty), `u16 visual_id`,
  `u16 match_id`.
- All 11 levels and all three difficulties start with the same multiset:
  - visual IDs 0–33, four tiles each (136);
  - visual IDs 34–41, one tile each (8).
- Normal tiles match by `visual_id`/`match_id` (equal). The eight alias IDs
  34–41 use `match_id` 34 or 35.
- The four IDs in each alias group are **visually identical**: 34/35/36/37 are
  the same green sprite, and 38/39/40/41 are the same gray sprite. The board
  therefore visibly contains **36 sprite kinds ×4**, not 42. The 42 visual IDs
  are 36 appearances plus six duplicate aliases.
- There is no visible "special" marker. "Special" is an analysis label for the
  alias groups, not an in-game category; a player simply sees 36 kinds of four
  identical tiles.
- The initial deal is a random permutation of this multiset and always fills
  all 144 cells.
- Shuffle preserves the remaining multiset and rearranges positions.

The web version deliberately samples 36 kinds per level from a larger curated
animal pool. This adaptation preserves 144 tiles and four copies per selected
kind; it is distinct from the original fixed inventory above. See
[`the animal-pool decision`](../docs/decisions/0002-expanded-animal-pool.md).

## Matching and path

- Select two present tiles with equal `match_id`. Because the alias IDs in each
  group are visually identical, the player-facing rule is still "select two
  identical-looking tiles."
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

Level 1 starts with A=5 (hint) and B=5 (shuffle) at difficulty 1/2, and
A=8/B=8 at difficulty 0 (弱). Every continuation adds +1 to A; it adds +1 to B
only at difficulty 1/2. At difficulty 0, B stays at its current value across a
continuation. The level index is stored at `0x41F166`.

## Per-level rearrangement

The original README states that each level has a different `消牌重整方式`.
These are deterministic board transformations, not visual effects and not
randomized. RE-0018 decodes all eight methods and the dispatch order.

After the pair is removed and the score/time are applied, the handler enters the
level dispatch only while `remaining > 0`. The final pair skips the
transformation and goes to the clear branch. For an ordinary match the
transformation runs before the legal-move finder and therefore before the
no-move/auto-shuffle decision.

If the match earns the third chance star, the card screen opens before that
path. The transformation is deferred: when the last pick closes the card screen
and tiles remain, the close handler applies the same level transform, then a
free shuffle and a chance-kind re-selection (see the card section).

The primitives move whole 6-byte cells within one row or column and preserve
their relative order:

```text
pack row left:    present cells, left-to-right, become columns 1..n
pack row right:   present cells, left-to-right, become columns 16-n+1..16
pack column up:   present cells, top-to-bottom, become rows 1..n
pack column down: present cells, top-to-bottom, become rows 9-n+1..9
```

`n` is the number of present cells in the affected segment. A segment is left
unchanged when `n` is zero or already full.

| Level | Index | Calls, in order | Effect |
| --- | --- | --- | --- |
| 1 | 0 | none | no rearrangement |
| 2 | 1 | `0x409040` | every column packs down |
| 3 | 2 | `0x4092b0` | every row packs left |
| 4 | 3 | `0x409510` | columns pack outward |
| 5 | 4 | `0x409980` | rows pack outward |
| 6 | 5 | `0x40a020` | columns pack inward |
| 7 | 6 | `0x40a490` | rows pack inward |
| 8 | 7 | `0x40afa0` | columns 1–8 pack down, columns 9–16 pack up |
| 9 | 8 | `0x40ab40` | rows 1–4 pack left, rows 5–9 pack right |
| 10 | 9 | `0x409980`, `0x409510` | rows pack outward, then columns pack outward |
| 11 | 10 | `0x40a490`, `0x40a020` | rows pack inward, then columns pack inward |

The L4 and L6 table entries point into the middle of the L10/L11 blocks:
`0x40d979` is the second call of `0x40d972`, and `0x40d989` is the second call
of `0x40d982`. L4 therefore runs only `0x409510`; L6 only `0x40a020`.

The split boundaries are columns 1–8 / 9–16 and rows 1–4 / 5–9.

- **Outward rows (`0x409980`)**: columns 1–8 pack left; columns 9–16 pack
  right.
- **Outward columns (`0x409510`)**: rows 1–4 pack up; rows 5–9 pack down.
- **Inward rows (`0x40a490`)**: columns 1–8 pack right; columns 9–16 pack
  left.
- **Inward columns (`0x40a020`)**: rows 1–4 pack down; rows 5–9 pack up.

The two calls in levels 10 and 11 must run in the listed order; the first
transform can move cells into segments used by the second. Levels 4 and 6
execute only the vertical call because their table entries enter the second
half of those blocks.

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
- Hint requires A > 0 and the hint flag `0x41F158 == 0`. It sets
  `0x41F158 = -1` and highlights the most recent legal pair found by the move
  finder (`0x41F15A/15C` = column,row of endpoint 1; `0x41F15E/160` = endpoint
  2). While a hint is active, clicking hint again does nothing and does not
  consume A; the flag clears on the next match.
- The hint does not recompute on click. The move finder refreshes at level
  start, after a match, and after a shuffle.
- If no legal move remains after a match: consume one B and shuffle if B > 0;
  otherwise the no-move failure branch runs (state 2, `0x41F188=3`). A natural
  72-match level-1 run hit auto-shuffle twice (B 99→98 at match 17, 98→97 at
  match 31); the B=0 failure branch was reproduced separately.
- Pause (v1.01) is a **paid reshuffle on resume**: entry requires B > 0 and
  only freezes the timer; clicking `GAME PAUSE` shuffles, guarantees a legal
  move, consumes one B, and does not re-roll the chance kind. At B = 0 the
  pause click is ignored, so the normal flow cannot underflow B.

## Chance stars and cards

- Chance kind (`0x41F0CC`) is re-selected by `0x408b20` at level start, after
  **every non-final match** (both the move-exists and auto-shuffle branches call
  it), after a manual/auto shuffle, and after the card-screen free shuffle.
  Pause resume does not call it, so pause does not re-roll the chance kind.
- The re-selection samples the full 36-kind pool, not the kinds still on the
  board. The panel can therefore show a kind that is no longer present; live
  12/12 re-rolls after a match chose absent kinds.
- The star check at `0x40D6AB` uses the chance kind in effect **before** the
  post-match re-selection. Matching a pair of that kind increments stars
  (`0x41F0EA`); then the chance kind is re-rolled for the next board.
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
- Timer rewards are capped at the level maximum (live: +10 s at 203875 →
  213875; at 225000 it stayed capped).
- The timer is frozen while the card screen is open (live: 203875 unchanged
  over 3.2 s) and resumes on close.
- The card screen closes when picks reach 0, then stars reset to 0.
- Stars are **not** reset by a level clear or Continue. They persist across
  level transitions until the card screen closes or a new game starts.
- If tiles remain when the screen closes, the game applies the pending level
  transform for the chance match, then performs a free shuffle (`0x408C00`) and
  re-selects the chance kind (`0x408B20`). The free shuffle does not consume B
  and preserves the occupied positions, so the transform's hole pattern stays
  while tile identities are permuted.

## Flow

```text
menu -> level start -> playing
playing -> chance match with third star -> card screen -> last pick
-> level transform + free shuffle + chance re-selection (if tiles remain) -> playing
playing -> final pair removed -> clear overlay (score count-up)
clear overlay click -> next level, score kept, A+1, B+1 except at 弱
level 11 clear -> final resource bonus -> completed
timer 0 or no-move failure -> failure overlay -> name entry (if qualifying)
-> write active high-score table -> menu

playing -> pause button (requires B > 0) -> GAME PAUSE overlay (timer frozen)
GAME PAUSE click -> shuffle + B-1 (chance kind unchanged) -> resume timer
playing -> exit button -> menu (round abandoned, no save)
```

`最佳記錄` reads the persisted table only. The name-entry screen shows the
current run score provisionally at its rank; that pending value is not part of
the best-records read.

## High score file

- Path: `\kawai2004.hst` under the Windows directory; UAC virtualization may
  place it under `VirtualStore\Windows`.
- Size: 660 bytes.
- Three contiguous difficulty tables × ten entries × 22 bytes:
  - `name[16]` space-padded
  - `score u32`
  - `level u16` (zero-based 0–10; 11 is the completed-game / `ALL PASS` sentinel)
- Difficulty 1 (強) uses entries 10–19. Scores are sorted descending and
  newly entered scores shift later entries down.
- A level-11 completion stores level 11 (the final clear increments
  `0x41F166` to 11); the `最佳記錄` screen renders that row as `ALL PASS`.
- A run qualifies only when `score > table[difficulty][9].score` (strictly
  greater than the current 10th-place score). Equal scores do not qualify, and
  a new equal score is inserted below an existing equal score.
- The name field is 16 bytes, space-padded. The entry screen accepts `A`–`Z`,
  space, backspace, and Enter; other keys, including Escape, are ignored. Enter
  on an empty field saves 16 spaces.
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
