---
id: RE-0017
title: Pause freezes the timer, exit returns to the menu without saving, and best-records reads only persisted rows
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
  - src/ui/game-view.ts
---

## Question

What do the pause button, exit button, and best-records menu entry do?

## Method

Clicked the live HUD controls at client coordinates and read the timer and
board state:

- pause: `(630, 13)`
- exit: `(752, 13)`
- best records: menu client `(565, 252)`

The pause/exit screenshots are under `re/.local/evidence/screens/`.

## Observations

### Pause

- Clicking the pause button produced the overlay `GAME PAUSE` /
  `CLICK TO CONTINUE`.
- The timer froze: 195860 ms before the pause, still 195860 ms after two
  seconds.
- Clicking the overlay at client `(400, 290)` resumed the round; the timer
  then decreased to 194860 ms after one second.
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
playing -> pause button -> frozen timer + GAME PAUSE overlay
GAME PAUSE click -> resume timer

playing -> exit button -> main menu (round abandoned, no high-score write)

menu -> best records -> persisted high-score table only
```

Pause must be modeled as a distinct session phase that stops time and board
input but does not change the clear/failure state. Exit is not a high-score
path.

## Confidence and limits

High for the timer freeze/resume, the exit-to-menu behavior, and the
best-records read-only behavior.

Sound/music toggles and the credits/website menu entries are outside the
gameplay ruleset.

## Open questions

- Are hints/shuffles blocked during pause? The overlay captures input, so this
  is a UI detail.
- Is the pause overlay reachable from the failure/clear overlays? Not observed.

## Implementation impact

Add a pause phase that freezes the timer and input and renders the
`GAME PAUSE` overlay. Treat exit as abandoning the round. The best-records
screen must read the persisted high-score table, never include the pending
current-run score.
