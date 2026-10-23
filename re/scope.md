# Scope

Last reviewed: 2026-10-23.

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

Runtime probes on 2026-10-22/23 and static analysis on 2026-10-23 established
the following. The consolidated implementation contract is in
[`RULESET.md`](RULESET.md). Detailed evidence is in
[`findings/RE-0001`](findings/RE-0001-board-runtime-layout.md) through
[`RE-0019`](findings/RE-0019-high-score-qualification-and-name-entry.md), the
[runtime session log](sessions/20261022-kawai2004-runtime.md), the
[level-transform](sessions/20261023-kawai2004-level-transforms.md),
[high-score](sessions/20261023-kawai2004-high-score-entry.md),
[continuation-resource](sessions/20261023-kawai2004-continuation-resources.md),
[alias-tile](sessions/20261023-kawai2004-alias-tiles.md), and
[chance-live](sessions/20261023-kawai2004-chance-live.md) sessions. The
static/live status of each claim is tracked in [`AUDIT.md`](AUDIT.md).

- The game is a matching-pair ("連連看") game distributed as a Windows build.
- The target build is v1.01 with the archive hash above.
- The live board is an 18 × 11 VB array of 6-byte cells; the playable area is
  16 × 9 (144 cells). The cell fields are `present`, `visual_id`, and
  `match_id`.
- Normal tiles match by `visual_id`/`match_id` (equal); the eight alias visual
  IDs 34–41 match by `match_id` groups 34 and 35, and each group is visually
  one sprite with four duplicate IDs.
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
  the next level limit, and adds one hint resource; shuffle also rises by one
  except at 弱 (difficulty 0), where it stays. The score is unchanged
  (RE-0010).
- There are 11 levels, all starting with 144 tiles. The initial multiset is
  invariant across levels and across difficulty 0/1/2: 34 normal kinds ×4 and
  eight alias IDs ×1 (visual IDs 34–41). Visually the four IDs in each alias
  group are identical (34–37 one green sprite, 38–41 one gray sprite), so the
  board shows **36 sprite kinds ×4**. The 42 visual IDs are 36 appearances plus
  six duplicate aliases; there is no visible special marker. "Special" is an
  analysis label, not an in-game category (RE-0001, RE-0011).
- Difficulty-1 timers run from 225 s down to 75 s in 15 s steps; resources run
  from 5/5 to 15/15. The final clear applies the resource bonus and ends in
  state 3 (RE-0011).
- The `機會` panel shows a match kind (`0x41F0CC`). The kind is re-selected
  after every non-final match, after a shuffle, and after the card screen; the
  star check uses the kind in effect before that post-match re-selection.
  Matching a pair of that kind adds one star (`0x41F0EA`); three stars open an
  18-card screen. Picks are 1–3 by difficulty; the 18 rewards are a shuffled
  permutation of fixed time/resource effects (RE-0012). When the last pick closes the screen
  and tiles remain, the game applies the pending level transform, then a free
  shuffle and chance-kind re-selection (RE-0012, RE-0018).
- The client is 800 × 600; the game has a top-10 high-score screen and uses
  `\kawai2004.hst` under the Windows directory (UAC-virtualized in the observed
  run). The file is 660 bytes, confirmed as three contiguous 10-entry tables
  of name[16] + score u32 + level u16 (RE-0014). The name-entry screen shows
  the current run score provisionally; the `最佳記錄` screen reads only the
  persisted file entries. A run qualifies only above the current 10th-place
  score for its difficulty; names are 16 bytes of uppercase letters/spaces
  (RE-0019).
- The top-right orange circular-arrow icon is shuffle (resource B); the blue
  star/flower icon is hint (resource A). Each use costs one (RE-0013).
- Pause (v1.01) requires B > 0. Entry only freezes the timer and shows
  `GAME PAUSE`; clicking it to resume reshuffles the board and consumes one B.
  The chance kind is not re-rolled. At B = 0 the pause click is ignored
  (RE-0017).
- Each level has a defined deterministic post-match board rearrangement
  (RE-0018). The transforms only move cells inside a row or column and preserve
  their relative order. They run after every non-final match, immediately or
  (if the card screen opened) after the last pick; the card-close path then
  performs a free shuffle. L2 sinks columns; L3 packs rows left; L4 pushes
  columns outward vertically; L5 pushes rows outward horizontally; L6 pulls
  columns inward vertically; L7 pulls rows inward horizontally; L8 sinks
  columns 1–8 and lifts columns 9–16; L9 packs rows 1–4 left and rows 5–9
  right; L10 combines L5 and L4; L11 combines L7 and L6.
- The menu has three difficulty settings labelled 弱/強/超強 with
  1000/10000/100000 values.

`src/` implements the recorded gameplay contract with pure TypeScript rules
and a Vue/Vuetify interface. Licensed emoji themes and browser-local records
are documented web adaptations. Per-level selection from an expanded animal
pool is also an explicit adaptation; see the
[animal-pool decision](../docs/decisions/0002-expanded-animal-pool.md),
[architecture](../docs/ARCHITECTURE.md)
and [asset provenance](../docs/ASSETS.md). The level-specific vtable
methods are **board rearrangements**, not visual updates; all eight transforms
and the ten dispatch cases are decoded in RE-0018. Exact RNG sequences and
original visual/audio assets remain outside the clean-room ruleset.

## Open questions

| ID    | Question                                                             | Status  |
| ----- | -------------------------------------------------------------------- | ------- |
| Q-001 | What is the playable board size and are there layout variants?        | confirmed: 18×11 array, full 16×9 playfield on all levels/difficulties |
| Q-002 | How many tile kinds exist, and what is their distribution per board?  | confirmed: 36 visible kinds ×4 (34 normal + 2 alias groups); internal 42 visual IDs |
| Q-003 | Are diagonal connections allowed, or only orthogonal?                 | confirmed: orthogonal only |
| Q-004 | Is the outer border always traversable? Are there corner restrictions?| confirmed: one-cell outer border traversable; no corner exception found |
| Q-005 | What are the exact turn and path rules for edge cases?                | confirmed: ≤2 turns, no passing through tiles; instructions and oracle agree |
| Q-006 | What is the round time limit, and does it vary by mode?               | confirmed: `[320,225,160] - [20,15,10] * level_index` seconds; 1000 ms/s decay |
| Q-007 | How are score, combo, and time bonus calculated?                      | confirmed pair/clear/time formulas and card rewards; no combo observed |
| Q-008 | What do hint and shuffle cost, and are they limited?                  | confirmed: A hint/B shuffle each cost 1; start 5 (8 at 弱); A +1 per continue, B +1 except at 弱; card rewards add more |
| Q-009 | What happens when no moves remain? Auto-shuffle or loss?              | confirmed static/live: consume B and shuffle; B=0 enters the failure branch |
| Q-010 | What is the menu, mode, and level progression flow?                   | confirmed: 11 full levels, clear/failure states, name entry, menu return |
| Q-011 | Which sounds and animations accompany selection and matching?         | out of scope for the clean-room ruleset (original assets not reproduced) |
| Q-012 | Is there persistent score or save data, and where is it stored?       | confirmed: 660-byte `kawai2004.hst`; three contiguous 10-entry name/score/level tables |
| Q-013 | What is each level's post-match board rearrangement?                  | confirmed: eight pack operations; L4/L6 single-axis, L10/L11 combine both; full dispatch in RE-0018 |
| Q-014 | What does pause do in v1.01?                                          | confirmed: requires B>0; entry freezes timer; resume shuffles and spends 1 B; B=0 pause ignored |

Add or update a finding in `findings/` before changing a rule that claims to
match the original game.
