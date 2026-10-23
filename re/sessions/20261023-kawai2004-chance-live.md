# 2026-10-23 — chance kind re-selection and star persistence

## Setup

| Field        | Value |
| ------------ | ----- |
| Target       | KAWAI 連連看 2004 v1.01 |
| Archive SHA  | `3e722be316006e07fa3da8c39fa7926db41966b1501f756513df2335a93142c8` |
| Analysis SHA | `f1eab078fa65f6fe63b2d5966adcddd1a24abfc99c6706ec30f033965e58f75a` (`Kawai2004.unpacked.exe`) |
| Live build   | packaged `Kawai2004-0.1.0-rc.1`, DxWnd windowed |
| Process      | `Kawai2004.exe`, PID 51368 this run |
| Window       | `ThunderRT5Form`, client 800 × 600 |
| Tools        | Python ctypes process probe + PostMessage clicks |
| Input        | Lawfully owned local copy |

## Question

Does the chance kind change after an ordinary match, and do stars survive a
level transition?

## Procedure

1. Start level 1 and read the board, `0x41F0CC` (chance kind), `0x41F0EA`
   (stars), and the hint endpoints at `0x41F15A`–`0x41F160`.
2. Click the current hint pair (a legal pair) and read the chance kind again.
3. Set the chance kind to the hint pair's kind (16) as a controlled
   precondition, then click the hint pair to earn the third star.
4. Read the card screen state, picks, and the 18 card records.
5. Click the first card, read B, stars, chance kind, and the board hash.
6. Set stars=2, force a one-pair board, clear it, click Continue, and read the
   stars on level 2.

Only the listed preconditions were written (chance kind, stars, board,
remaining, timer, score); the match, card, clear, and continue routines ran
normally.

## Observations

### Chance kind changes after a match

```text
before match: chance_kind=26  remaining=144  stars=0
matched the hint pair (a non-chance pair)
after match:  chance_kind=3   remaining=142  stars=0
```

A non-chance match re-selected the chance kind. The code path is the
move-exists branch at `0x40da58`, which calls `0x408b20` after the move check;
the auto-shuffle branch at `0x40d9ff` also calls it. So the chance kind is
re-selected after every non-final match, not only after a chance match.

### Third star and card screen

```text
forced chance_kind=16 (the hint pair's match kind)
stars=2 before the match
clicked the pair -> stars=3, ui_state=4 (card screen)
picks=1
cards = permutation of 0..17
```

The star check used the chance kind before the post-match re-selection. The
card screen deferred the chance re-roll; the kind stayed 16 while the screen
was open.

### Card close

```text
clicked card reward 8 (B+1)
B 6 -> 7
stars 3 -> 0
picks 1 -> 0
ui_state 4 -> 1
chance_kind 16 -> 34
board hash changed (free shuffle)
```

### Star persistence across continue

```text
forced stars=2, one-pair board, remaining=2
final pair -> clear overlay, stars still 2
Continue -> level 2, max_timer=210000, stars still 2
```

Stars survive a level transition. The only star writes are the chance-match
increment (`0x40d6c7`/`0x40d6d9`), the card-close reset (`0x4152e2`), and the
new-game reset (`0x4199a6`). There is no level-start/continue reset.

## Evidence

- Live readings above.
- `re/.local/evidence/screens/live-card-screen.png` (18-card screen, 3 stars,
  picks=1).
- Static xrefs: `0x41f0cc` ← `0x408b9c`, `0x40d6ab`; `0x41f0ea` writes at
  `0x40d6c7`, `0x40d6d9`, `0x4152e2`, `0x4199a6`.

## Limitations

- The chance kind, stars, board, remaining, timer, and score were written as
  preconditions in parts of the run; the game's own handlers performed the
  match, card, clear, and continue transitions.
- The chance kind re-selection is random, so a repeat can coincidentally
  choose the same kind.

## Follow-ups

- None for the star persistence or chance re-selection rules.
