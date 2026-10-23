# Claim audit — static and live evidence

Audited 2026-10-23 against `Kawai2004.unpacked.exe`
(`f1eab078fa65f6fe63b2d5966adcddd1a24abfc99c6706ec30f033965e58f75a`)
and the packaged windowed `Kawai2004-0.1.0-rc.1` build.

Status values:

- **both** — direct static evidence and a live observation agree.
- **static+partial** — static evidence; live covers part of the claim.
- **static** — static only; no clean live isolation.
- **out** — excluded by the clean-room or nondeterminism policy.

Controlled live tests sometimes wrote board cells, timer, score, stars, chance
kind, or resources as preconditions. The game's own match, transform, card,
clear, failure, pause, and high-score routines then ran normally.

## Board

| ID | Claim | Static | Live | Status |
| --- | --- | --- | --- | --- |
| B1 | 18×11 logical array, 6-byte cells, playable 16×9 | descriptor `0x41F0F0`, pointer `0x41F118`; RE-0001 | descriptor read; 16×9 border zeroed; 144 present | both |
| B2 | fields `present`/`visual_id`/`match_id` | cell copy sites `0x4087B0`, `0x409040`; RE-0001 | raw cell reads match the field meanings | both |
| B3 | 34 normal visual IDs ×4 + 8 alias IDs ×1; 36 visible kinds ×4 | setup loop `0x4087B0`; RE-0001 | 11 level dumps: 144 present, 42 visual IDs, 36 match groups | both |
| B4 | alias groups 34–37 and 38–41 are visually identical | setup maps `index-102` (34–41) and `index/4` (34/35) | pixel comparison: 0 diffs within each group | both |
| B5 | no visible special marker | the alias IDs are ordinary sprites | annotated level-1 screenshot | both |
| B6 | initial deal is a random permutation filling 144 cells | RNG/shuffle at level start | multiple new games and 11 level dumps | both |
| B7 | shuffle preserves multiset | `0x408C00` copies whole cells; RE-0013 | B 5→4, board hash changed, multiset equal, 144 tiles | both |

## Matching and path

| ID | Claim | Static | Live | Status |
| --- | --- | --- | --- | --- |
| M1 | match two present tiles with equal `match_id` | `0x40B400`/`0x40D430`; RE-0015 | normal and alias matches | both |
| M2 | orthogonal, no passing through tiles, border allowed | dispatcher `0x40B610`; RE-0002 | straight, one-turn, border-blocked accepted | both |
| M3 | maximum two turns | sub-checkers; RE-0002 | oracle cases; enclosed pair rejected | both |
| M4 | left click selects, right click cancels | instructions + input handler | real right-button event canceled; next click selected | both |
| M5 | path checker address map | `0x40B610`, `0x40B6E0`, `0x40BAA0`, `0x40BE60`, `0x40C830` | behavior agrees with dispatcher; addresses are static identity | static |
| M6 | legal pair removes both and decrements remaining by 2 | match handler; RE-0008 | remaining 144→142, score +4 | both |

## Levels, time, and transforms

| ID | Claim | Static | Live | Status |
| --- | --- | --- | --- | --- |
| L1 | 11 levels, names and timer table | `0x40DAD0`, level table; RE-0011 | 11-level sweep at 強; names captured | both |
| L2 | max time `[320,225,160] - [20,15,10]*i` seconds | `0x40DAD0`; RE-0008 | 弱 320 s, 強 225 s, 超強 160 s at L1; 弱 L2 300 s, 超強 L2 150 s | static+partial (0/2 only L1–L2 live; 強 full sweep) |
| L3 | A/B start 8/8 at 弱, 5/5 at 強/超強 | `0x40DD3C`; RE-0007 | live at all three difficulties | both |
| L4 | continuation A+1; B+1 except at 弱 | `0x41A344`; RE-0010 | 弱 8/8→9/8, 強 5/5→6/6, 超強 5/5→6/6 | both |
| L5 | level index at `0x41F166` | used by dispatch/score | live reads 0, 1, 10 | both |
| L6 | L2 packs every column down | `0x409040`; RE-0018 | marker board matched exactly | both |
| L7 | L3 packs every row left | `0x4092B0`; RE-0018 | marker board matched exactly | both |
| L8 | L4 packs columns outward only | `0x40D979` → `0x409510`; RE-0018 | marker board matched exactly | both |
| L9 | L5 packs rows outward | `0x409980`; RE-0018 | marker board matched exactly | both |
| L10 | L6 packs columns inward only | `0x40D989` → `0x40A020`; RE-0018 | marker board matched exactly | both |
| L11 | L7 packs rows inward | `0x40A490`; RE-0018 | marker board matched exactly | both |
| L12 | L8 columns 1–8 down, 9–16 up | `0x40AFA0`; RE-0018 | marker board matched exactly | both |
| L13 | L9 rows 1–4 left, 5–9 right | `0x40AB40`; RE-0018 | marker board matched exactly | both |
| L14 | L10 rows outward then columns outward | `0x40D972` → `0x409980`, `0x409510`; RE-0018 | marker board matched exactly | both |
| L15 | L11 rows inward then columns inward | `0x40D982` → `0x40A490`, `0x40A020`; RE-0018 | marker board matched exactly | both |
| L16 | transforms run after non-final match, before move check | `0x40D8D3`, `0x40D928`; RE-0018 | marker test after a non-final match; final-pair skip static | static+partial |
| L17 | card-screen deferral then free shuffle/chance re-roll | `0x4152B3`, `0x415450`; RE-0012/0018 | at the `0x408C00` entry the board matched the expected L10 transform exactly; close then changed hash/kind | both |

## Score and timer

| ID | Claim | Static | Live | Status |
| --- | --- | --- | --- | --- |
| S1 | pair score `(difficulty+1)^2*(level+1)` | `0x40D473`; RE-0008 | L1: +1/+4/+9; L2 強 +8 | both |
| S2 | match time +6000/+4000/+3000 ms | `0x40D530`; RE-0008 | 弱 +5375 net, 強 +3938, 超強 +2390 net | both |
| S3 | timer capped at level max | `0x40D5A7`; RE-0008 | near-cap matches added only headroom | both |
| S4 | natural decay 1000 ms/s | `0x41011F`; RE-0008 | 2000 ms per 2 s | both |
| S5 | clear bonus `50G + 2G*floor((T-1)/1000)` | `0x411FC0`; RE-0009 | L1 1000 ms: 弱 63, 強 120, 超強 177; 強 10000 ms 156; L2 強 1988 | both |
| S6 | final resource bonus | `0x412009`; RE-0009 | 弱 8493; 強 24320; 超強 26547, resources zero, state 3 | both |
| S7 | clear sets timer 0 and counts score up | clear routine | overlay count-up; final values used | both |

## Resources, pause, and no-move

| ID | Claim | Static | Live | Status |
| --- | --- | --- | --- | --- |
| R1 | A = hint, B = shuffle, one use costs 1 | `0x41A107`, `0x41A07E`; RE-0013 | A 5→4; B 5→4 | both |
| R2 | hint uses move-finder endpoint fields | `0x41F15A`–`0x41F160`; RE-0015 | endpoints read; advanced after match | both |
| R3 | hint does not recompute on click; refresh after match | handler + move finder | endpoints (2,1)/(12,1), then (3,1)/(14,1) | both |
| R4 | hint blocked while active | `0x41F158 == 0` gate; RE-0013 | first click A 4→3; second stayed 3, endpoints unchanged | both |
| R5 | no-move B>0 auto-shuffle consumes B | `0x40D9A6`–`0x40D9FF`; RE-0015 | natural 72-match run: auto-shuffle at match 17 B 99→98, match 31 98→97 | both |
| R6 | no-move B=0 failure state | `0x40DA0D`; RE-0015 | B=0, unique singles → state 2/ui 3, remaining 4 | both |
| R7 | pause requires B>0; entry freezes timer | `0x41A178`; RE-0017 | B=5 entry ui 7, B unchanged; B=0 click ignored | both |
| R8 | resume shuffles, B−1, chance unchanged | `0x41A860`; RE-0017 | B 5→4, board hash changed, chance kind unchanged | both |

## Chance stars and cards

| ID | Claim | Static | Live | Status |
| --- | --- | --- | --- | --- |
| C1 | chance kind re-selected after every non-final match | `0x40DA58`/`0x40D9FF` → `0x408B20`; RE-0012 | 26→3 after a non-chance match | both |
| C2 | star check uses pre-re-roll kind | `0x40D6AB`; RE-0012 | forced kind 16: stars 2→3 | both |
| C3 | 3 stars open card screen | `0x40D6E4`, `0x40D704`; RE-0012 | ui_state 4, picks >0 | both |
| C4 | pick table by difficulty | `0x40D732`; RE-0012 | samples 弱 2, 強 1/2, 超強 1 | static+partial |
| C5 | 18 cards are permutation 0–17 | `0x40D230`; RE-0012 | live deck permutation | both |
| C6 | reward table | jump table `0x41A7AC`; RE-0012 | code 8 B+1, code 6 B+1, code 0 +10 s | static+partial (three codes live) |
| C7 | timer reward capped | `0x41F184`; RE-0012 | 203875→213875; at 225000 stayed 225000 | both |
| C8 | card screen freezes timer | card-screen state; RE-0012 | 203875 unchanged over 3.2 s | both |
| C9 | card close resets stars, free shuffle, chance re-roll | `0x4152E2`, `0x4153A1`; RE-0012 | stars 3→0, chance 16→34, board hash changed | both |
| C10 | stars persist across continue; reset on card close/new game | writes at `0x40D6C7`, `0x4152E2`, `0x4199A6` | stars=2 → clear → level 2 stars=2 | both |
| C11 | chance kind can be absent from the remaining board | `0x408B20` samples the full pool | 12/12 post-match re-rolls chose absent kinds (only kind 9 left) | both |

## Flow and high score

| ID | Claim | Static | Live | Status |
| --- | --- | --- | --- | --- |
| F1 | menu → level → playing; clear/failure overlays | state handlers; RE-0005/0016 | live menu, clear, failure | both |
| F2 | continue advances level, keeps score, A+1, B+1 except 弱 | `0x41A344`; RE-0010 | 弱/強/超強 live | both |
| F3 | level 11 clear → resource bonus → completed | `0x412009`; RE-0009/0011 | 弱 8493; 強 24320; 超強 26547, state 3 | both |
| F4 | timer 0 failure keeps score, opens name entry if qualifying | `0x40D90D`; RE-0016 | timeout live | both |
| F5 | no-move failure shares the overlay | `0x40DA3E`; RE-0015 | B=0 unique-singles live | both |
| F6 | high-score path, 660 bytes, three 10-entry tables | `0x41A950`; RE-0014 | 660-byte read/write; weak 8493, strong 24/4, ultra 1 saves | both |
| F7 | qualification strict `>` 10th, new tie below equal | `0x41C3A0`; RE-0019 | equal 10th rejected; 2 inserted below 2 | both |
| F8 | name 16 bytes A–Z/space/backspace/Enter; Escape ignored; empty spaces | `0x41B730`; RE-0019 | saved entry; Escape did not cancel; empty Enter saved | both (keyboard injection artifact noted) |
| F9 | save on Enter; best records reads persisted only | `0x41A950`; RE-0014/0016 | 7777 save and 24/4 best-records read | both |
| F10 | pause/resume and exit flow | RE-0017 | timer frozen; exit to menu | both |

## Out of scope

| ID | Item | Reason |
| --- | --- | --- |
| X1 | exact VB RNG seed/permutation | nondeterministic; seedable clone uses own RNG |
| X2 | original artwork/audio/fonts/binaries | clean-room policy |
| X3 | synthetic keyboard mapping (`UGVX` vs `TEST`) | input-injection artifact, not a game rule |
| X4 | visual animation timing | presentation, not board state |

## Remaining static-only or partial items

- **M5 path-checker addresses**: address identity is static; live tests cover
  the matching behavior, not the identity of the code locations.
- **L2 difficulty/level timer table**: all eleven levels were observed live at
  difficulty 1; difficulties 0/2 were observed live only at levels 1 and 2.
- **L16 transform timing**: a non-final match was verified live; skipping the
  transform for the final pair remains a static control-flow claim.
- **C4 pick table probabilities**: the table is static; live samples confirm
  the range but not the full distribution.
- **C6 card rewards**: codes 0, 6, and 8 were isolated live; the other reward
  codes remain supported by the static dispatch table.
- **X1–X4** remain outside the ruleset by policy.
