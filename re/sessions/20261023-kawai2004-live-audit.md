# 2026-10-23 — static/live claim audit

## Setup

| Field        | Value |
| ------------ | ----- |
| Target       | KAWAI 連連看 2004 v1.01 |
| Archive SHA  | `3e722be316006e07fa3da8c39fa7926db41966b1501f756513df2335a93142c8` |
| Analysis SHA | `f1eab078fa65f6fe63b2d5966adcddd1a24abfc99c6706ec30f033965e58f75a` (`Kawai2004.unpacked.exe`) |
| Live build   | packaged `Kawai2004-0.1.0-rc.1`, DxWnd windowed |
| Process      | several `Kawai2004.exe` runs, PIDs recorded below |
| Tools        | REA 6.7.0, Ghidra 12.1.4, GNU objdump 2.42, Python ctypes probe, PostMessage/mouse_event |
| Input        | Lawfully owned local copy |

Controlled tests wrote board cells, timer, score, stars, chance kind, or
resources as preconditions where noted. The game's own handlers then ran.

## 1. Level transforms (all ten levels)

A sparse marker board was written with a removable pair at `(1,1)-(1,2)` and
five marker pairs. After the match, the live board was compared cell by cell
against the predicted transform for each level index 1–10.

```text
level 1..10: state 0, remaining 10, mismatches 0 for every level
```

This live-verifies L2–L11, including the L4/L6 single-call fall-through and the
L10/L11 two-call order.

Card-close deferral was isolated at level index 9 (L10): a Frida hook on the
free-shuffle entry `0x408C00` captured the board **before** the shuffle, and
the 10 present cells matched the predicted L10 (H-outward then V-outward)
transform exactly. The subsequent close changed the board hash and chance kind.

## 2. Path rules

Controlled board cases, level 0:

| Case | Result |
| --- | --- |
| straight `(1,1)-(1,3)` | accepted, +4 score, remaining −2 |
| one-turn `(1,1)-(3,3)` | accepted |
| border route `(1,1)-(1,5)`, blockers on row 1 | accepted via row 0 |
| enclosed `(2,2)-(2,4)` inside a 3×3 blocker ring | rejected, remaining unchanged |

Right-click cancel was tested with a real `mouse_event` right-button event:
after selecting `(1,1)`, right-click canceled the selection, so the next left
click selected `(1,3)` instead of matching; remaining stayed 4.

PostMessage right-button events did not cancel; only the real mouse event did.
This is an injection-method limitation, not a game-rule difference.

## 3. Difficulty 0 and 2

| Check | 弱 | 超強 |
| --- | --- | --- |
| menu enum | 0 | 2 |
| level-1 timer/max | 319000 / 320000 ms | 159094 / 160000 ms |
| level-1 A/B | 8/8 | 5/5 |
| pair score at L1 | +1 | +9 |
| match timer | 300000 → 305375 (+5375 net) | 150000 → 152390 (+2390 net) |
| clear with 1000 ms | 63 | 177 |
| continue to L2 | A 8→9, B 8→8, max 300000, score 63 | A/B 5→6/6, max 150000, score 177 |

The 弱 B-skip on continue is confirmed live. Difficulty-1 values are in the
2026-10-22 session (5/5 → 6/6, clear 120/156/1988).

A difficulty-2 level-11 clear with A/B=15/15 and 1000 ms produced **26547**,
resources 0, state 3, matching the predicted pair + clear + resource bonus.
A difficulty-0 level-11 clear with A/B=18/8 and 1000 ms produced **8493**,
resources 0, state 3.

## 4. High score

The file was backed up before the test and restored after it.

Current saved 強 table: `[24, 4, 0, 0, …]` (10th = 0).

- score 0 → no name screen.
- score 1 → name screen; saved at rank 2.

Custom 強 table `[10, 9, 8, 7, 6, 5, 4, 3, 2, 1]` (10th = 1):

- score 1 (equal to 10th) → no name screen.
- score 2 → name screen.
- saved table became `[10, 9, 8, 7, 6, 5, 4, 3, 2, 2]`; the new 2 was
  inserted below the existing 2, and the old 1 was discarded.
- A difficulty-2 score-1 save wrote table 2 entry 0.
- A difficulty-0 level-11 completion (8493) wrote table 0 entry 0 with level
  field 11; the `最佳記錄` screen rendered that row as `ALL PASS`.

Escape did not cancel the entry; Enter saved. Injected key events again
produced `UGVX` instead of `TEST`, the same input-injection artifact noted in
RE-0014. The original 660-byte file was restored.

## 5. Cards

| Check | Result |
| --- | --- |
| pick samples | 弱 2; 強 1 and 2; 超強 1 |
| deck | permutation of 0–17 |
| timer freeze | 203875 ms unchanged over 3.2 s while open |
| reward code 0 | +10 s: 203875 → 213875 |
| reward at max | 225000 stayed 225000 |
| close | stars 3→0, chance kind re-rolled, board hash changed |
| chance domain | 12/12 post-match re-rolls chose a kind absent from the board (only kind 9 remained) |

## 6. Hint re-click

A 4 → 3 on the first hint click. A second hint click while
`0x41F158 == -1` left A at 3 and the endpoints unchanged. The hint is
unavailable until the highlighted pair is matched.

## 7. No-move

- B=0 with a removable pair and four unique singles: state 2, ui 3, remaining
  4; the failure branch was reproduced.
- B>0 was tested naturally by playing the whole level with the hint-endpoint
  bot (72 matches, no manual shuffle or pause). Two auto-shuffles occurred:
  match 17 B 99→98 (remaining 110), match 31 B 98→97 (remaining 82). The level
  cleared at match 72 with score 748. Auto-shuffle consumes one B.
- Artificial controlled boards can desynchronize the paint/remaining state;
  only the natural run is used for R5.

## Evidence

- `re/.local/evidence/screens/audit-transform-fail.png`
- `re/.local/evidence/screens/live-card-screen.png`
- `re/.local/evidence/highscore-backup-audit.hst` (restored to the VirtualStore)
- `re/AUDIT.md` claim matrix.

## Limitations

- The exact card-pick probability distribution is static; live samples only
  confirm the value range.
- Path-checker address identity is static by nature; live evidence covers the
  behavior.
- Controlled writes can desynchronize the game's paint/remaining state; only
  tests that stayed state 0 were used as board evidence.
