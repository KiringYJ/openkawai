---
id: RE-0017
title: Pause requires B > 0 and freezes the timer; the resume click spends one B and reshuffles
status: confirmed
confidence: high
target: KAWAI 連連看 2004 v1.01
environment:
  os: Windows 11 x64
  locale: zh-TW
evidence:
  - re/sessions/20261022-kawai2004-runtime.md
  - re/sessions/20261023-kawai2004-pause-reshuffle.md
implementation:
  - src/game/session.ts
  - src/ui/App.vue
---

## Question

What do the pause button, exit button, and best-records menu entry do?

## Method

Clicked the live HUD controls at client coordinates and read the timer and
board state:

- pause: `(630, 13)`
- exit: `(752, 13)`
- best records: menu client `(565, 252)`

The pause/exit screenshots are under `re/.local/evidence/screens/`. A later
controlled probe read B, the timer, and a board hash at B=5 and at B=0, then
clicked pause and resume. The entry handler is `0x41a178`; the resume handler
is `0x41a860`. The v1.01 README also states that pause deducts the reshuffle
resource.

## Observations

### Pause

- The v1.01 README states: `Ver 1.01 (2004.02.08) 增加暫停功能(會扣『牌面重整』資源數)。`
  Pause was added in v1.01 and deducts the board-reshuffle resource.
- Pause **entry** is handled at `0x41a178`. It checks `B > 0`; if B is zero
  it skips the pause state entirely. With B > 0 it sets `0x41f188 = 7`
  (`GAME PAUSE`) and does **not** shuffle or decrement B.
- Pause **resume** is handled at `0x41a860` (the address previously mistaken
  for the entry handler). It calls the shuffle `0x408c00`, runs the legal-move
  finder `0x40b400` in a loop until a move exists, decrements resource B
  (`0x41f1ae`), records a timestamp, and sets `0x41f188 = 1` (playing).
- The resume handler does **not** call the chance setup `0x408b20`, so pause
  does not re-roll the chance kind. Manual/auto shuffles and every non-final
  match do re-roll it.
- Clicking the pause button produced the overlay `GAME PAUSE` /
  `CLICK TO CONTINUE`.
- The timer froze: 195860 ms before the pause, still 195860 ms after two
  seconds.
- Controlled live test at B=5: pause entry left B=5 and the board hash
  unchanged; resume changed B to 4 and the board hash to a new value.
- Controlled live test at B=0: clicking pause left `0x41f188` at 1 (playing),
  showed no overlay, and left B=0. The entry gate prevents the underflow; the
  pause button is effectively disabled when B is empty.
- `0x41F164` stayed 0 during pause; pause is a separate UI/flow state, not the
  clear/failure state.

### Exit

- Clicking the exit button during play returned to the main menu immediately.
- There was no confirmation dialog and no high-score save prompt.
- The process stayed alive at the menu.

### Best records

- The menu `最佳記錄` entry opens the read-only high-score table.
- With the file containing 24 and 4, the screen showed exactly those rows and
  no extra default row.
- The prompt `CLICK TO CONTINUE` returns to the menu.

### Restart

No separate in-game restart control was found. Starting a game from the menu
creates a fresh round with the selected difficulty; exit/clear/failure return
to the menu.

## Interpretation

```text
playing -> pause button:
    if B <= 0: ignore the click
    else: state = GAME PAUSE; timer frozen (no cost yet)

GAME PAUSE click (resume):
    shuffle 0x408C00 + move-finder loop until a move exists
    resourceB -= 1
    state = playing; timer resumes

playing -> exit button -> main menu (round abandoned, no high-score write)

menu -> best records -> persisted high-score table only
```

Pause is a **paid reshuffle on resume** in v1.01. Entry is free but requires at
least one B; the resume click spends one B and shuffles once, preserving the
chance kind. B=0 makes pause unavailable, so the normal flow cannot underflow.
Exit is not a high-score path.

## Confidence and limits

High for the timer freeze/resume, the exit-to-menu behavior, and the
best-records read-only behavior.

High for the entry gate and the resume cost: `0x41a178` checks B > 0 before
setting state 7, and `0x41a860` shuffles, runs the move-finder loop, and
decrements `0x41f1ae` on resume. The v1.01 README independently states that
pause deducts the reshuffle resource.

The B=0 behavior is confirmed live: pause is unavailable and no underflow
occurs. The resume handler itself has no guard, but it is only reachable after
a B > 0 entry, and B cannot change while the GAME PAUSE overlay is up.

Sound/music toggles and the credits/website menu entries are outside the
gameplay ruleset.

## Open questions

- Are hints/shuffles blocked during pause? The overlay captures input; not
  separately measured.
- Is the pause overlay reachable from the failure/clear overlays? Not observed.

## Implementation impact

Add a pause phase that requires B > 0. Pause entry freezes the timer/input and
renders `GAME PAUSE` without spending anything. Resume shuffles once (with a
legal-move guarantee), spends one B, preserves the chance kind, and unfreezes
the timer. At B=0 the pause click is ignored. Treat exit as abandoning the
round. The best-records screen must read the persisted high-score table, never
include the pending current-run score.
