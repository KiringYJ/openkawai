# Scope

Last reviewed: 2026-10-22.

## Target

| Field           | Value                                                                 |
| --------------- | --------------------------------------------------------------------- |
| Game            | KAWAI 連連看 2004                                                      |
| Version         | v1.01                                                                  |
| Original archive| `kawai2004v101.zip`                                                    |
| SHA-256         | `3e722be316006e07fa3da8c39fa7926db41966b1501f756513df2335a93142c8`     |
| Author page     | [archived page](https://web.archive.org/web/20080604052530/http://cps-chen.myweb.hinet.net/kawai2004/kawai2004.htm) |
| Archive source  | [archived ZIP](https://web.archive.org/web/20070227095657id_/http://cps-chen.myweb.hinet.net/kawai2004/kawai2004v101.zip) |

The hash and links are cross-checked against
[`kawai-win11-compat`](https://github.com/KiringYJ/kawai-win11-compat). The
archive is **not** stored in this repository.

## Legal boundary

- The original executable, archives, artwork, music, and third-party runtime
  files are not part of this project.
- Analysis may only use a copy obtained and run lawfully by the investigator.
- Findings must describe observable behaviour. Do not copy decompiled code or
  extracted resources into tracked files.
- The placeholder tile set is original work, not a reproduction of the original
  art.

## Reported runtime context

The sibling compatibility project reports that Kawai2004 is a Visual Basic 5
application and uses a DirectX-for-Visual-Basic runtime DLL through a
registration-free COM manifest on Windows 11. Treat this as context, not as an
independently confirmed fact for this repository; verify before relying on it.

## Known behaviour

Runtime probes on 2026-10-22 established the following. See
[`findings/RE-0001`](findings/RE-0001-board-runtime-layout.md) through
[`RE-0005`](findings/RE-0005-ui-and-high-score-flow.md) and the
[session log](sessions/20261022-kawai2004-runtime.md).

- The game is a matching-pair ("連連看") game distributed as a Windows build.
- The target build is v1.01 with the archive hash above.
- The live board is an 18 × 11 VB array of 6-byte cells; the playable area is
  16 × 9 (144 cells). The cell fields are `present`, `visual_id`, and
  `match_id`.
- Normal tiles match by `visual_id`/`match_id` (equal); the eight special
  visual IDs 34–41 match by `match_id` groups 34 and 35.
- A legal path is orthogonal, may use the one-cell outer border, and allows at
  most two turns.
- Score per pair is `(difficulty+1)^2 * (level_index+1)`: level 1 / difficulty
  1 scores 4, level 2 / difficulty 1 scores 8. A match adds `[6000,4000,3000]`
  ms by difficulty. Per-level time limits are `[320,225,160] - [20,15,10] *
  level_index` seconds for 弱/強/超強. The level-start dispatcher at `0x40dad0`
  initializes level 1 with exactly **225000 ms** at difficulty 1.
- Clearing a level converts the remaining timer into score in 1000 ms ticks,
  then adds a base clear bonus; see RE-0009. At level 1 / difficulty 1, two
  controlled clears produced 120 and 156 points for 1 s and 10 s remaining;
  a level-2 clear with 200 s produced 1988.
- Continuing past the clear overlay advances the level, resets the timer to
  the next level limit, and adds one to each resource; the score is unchanged
  (RE-0010).
- There are 11 levels, all starting with 144 tiles. Difficulty-1 timers run
  from 225 s down to 75 s in 15 s steps; resources run from 5/5 to 15/15. The
  final clear applies the resource bonus and ends in state 3 (RE-0011).
- The `機會` panel shows a normal tile kind (`0x41F0CC`). Matching a pair of
  that kind adds one star (`0x41F0EA`); three stars open an 18-card screen.
  Picks are 1–3 by difficulty; the 18 rewards are a shuffled permutation of
  fixed time/resource effects (RE-0012).
- The client is 800 × 600; the game has a top-10 high-score screen and uses
  `\kawai2004.hst` under the Windows directory (UAC-virtualized in the observed
  run). The file is 660 bytes, consistent with 30 entries of
  name[16] + score u32 + level u16 (RE-0014).
- The top-right orange circular-arrow icon is shuffle (resource B); the blue
  star/flower icon is hint (resource A). Each use costs one (RE-0013).
- The menu has three difficulty settings labelled 弱/強/超強 with
  1000/10000/100000 values.

Still provisional in the implementation: the exact clear bonus, the
level-specific reshuffle routines, the card reward table, the resource counts,
the difficulty scaling, and the high-score file format.

## Open questions

| ID    | Question                                                             | Status  |
| ----- | -------------------------------------------------------------------- | ------- |
| Q-001 | What is the playable board size and are there layout variants?        | partial: 16×9 playfield, 18×11 array; level shapes not fully mapped |
| Q-002 | How many tile kinds exist, and what is their distribution per board?  | partial: 34 normal ×4; 8 specials in 2 groups of 4 on L1/L2 |
| Q-003 | Are diagonal connections allowed, or only orthogonal?                 | partial: orthogonal paths observed; diagonal not exhaustively tested |
| Q-004 | Is the outer border always traversable? Are there corner restrictions?| partial: border accepted on L1; level exceptions unresolved |
| Q-005 | What are the exact turn and path rules for edge cases?                | partial: ≤2 turns and border route confirmed; one L2 contradiction |
| Q-006 | What is the round time limit, and does it vary by mode?               | confirmed: `[320,225,160] - [20,15,10] * level_index` seconds; 1000 ms/s decay |
| Q-007 | How are score, combo, and time bonus calculated?                      | confirmed pair/clear/time formulas and card rewards; no combo observed |
| Q-008 | What do hint and shuffle cost, and are they limited?                  | confirmed: hint A and shuffle B each cost one; both start 5 and grow per level/card |
| Q-009 | What happens when no moves remain? Auto-shuffle or loss?              | partial: README describes auto-shuffle; not yet isolated |
| Q-010 | What is the menu, mode, and level progression flow?                   | confirmed: 11 full levels, linear timers/resources, final state 3 |
| Q-011 | Which sounds and animations accompany selection and matching?         | unknown |
| Q-012 | Is there persistent score or save data, and where is it stored?       | confirmed: 660-byte `kawai2004.hst`; three contiguous 10-entry name/score/level tables |

Add a finding in `findings/` before changing a provisional constant in `src/`.
