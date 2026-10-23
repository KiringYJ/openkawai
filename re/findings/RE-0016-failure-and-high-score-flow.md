---
id: RE-0016
title: Failure and high-score entry flow: state 1 overlay, name entry, immediate save, return to menu
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
  - src/game/high-scores.ts
  - src/ui/App.vue
---

## Question

What happens when the round fails, and how does the high-score entry flow
finish?

## Method

A fresh difficulty-1 game was given score 7777 and timer 0. The resulting
overlay was captured, clicked once, and the high-score screen was captured.
A synthetic four-character name and Enter were sent. The high-score file was
read before and after, then restored from a backup.

## Observations

1. Setting the timer to 0 and waiting produced `0x41F164 = 1`, timer 0,
   score unchanged at 7777.
2. The overlay title is `挑戰失敗` and includes both reasons
   `時間已用完` and `無牌可消除`. The prompt is `請在此視窗內按一下 繼續`.
   This appears to be a shared failure overlay, not a timeout-only overlay.
3. Clicking inside the overlay opened the high-score name screen:
   - `NO`, `NAME`, `SCORE`, `LEVEL` columns
   - ten rows
   - score 7777 at rank 1
   - a selected blue name field
   - prompt `KEY IN YOUR NAME AND PRESS ENTER TO CONTINUE`
4. After Enter, the record was saved immediately and the game returned to the
   main menu.
5. The save inserted the record at high-score entry index 10 (the difficulty-1
   table), shifting older entries down. See RE-0014.
6. The high-score entry screen showed the **current failed run's score** (100
   in the earlier run, 7777 in the controlled run) provisionally at its rank;
   this value was not yet in the file. After saving, the persisted table
   contained the new score and the provisional current-run row was gone. The
   `最佳記錄` screen reads only persisted entries.

## Interpretation

```text
playing (state 0)
  -> timer reaches 0 or no-move failure
  -> failure overlay (state 1)
  -> click
  -> high-score name entry, if the score qualifies
  -> Enter
  -> write the active difficulty table immediately
  -> main menu
```

The score is kept through the failure overlay and high-score entry. The score
is not reset by the failure path.

## Confidence and limits

High for the state value, overlay text, name screen, immediate write, and
return to the menu at difficulty 1.

The timeout path is directly observed. The no-move branch sets the same failure
state and overlay (RE-0015); the internal reason flag differs but the screen is
shared. The qualification threshold and name-entry behavior are resolved in
RE-0019; the earlier `100` is the pending run score, not a file row (RE-0014).

## Open questions

- Is there a separate no-move failure state or only this shared overlay?
  The static branch uses the same state 2 / failure overlay; only the internal
  reason flag differs.
- What is the minimum score needed to enter the high-score screen? Resolved in
  RE-0019: strictly greater than the current 10th-place score.
- Is the default `100` a built-in row or a placeholder? Resolved in RE-0014:
  it is the pending current-run score, not a stored row.
- What happens if the player presses Escape or enters an empty name? Resolved in
  RE-0019: Escape is ignored; Enter on an empty field saves 16 spaces.

## Implementation impact

Model failure as a distinct session phase. The clear phase and the failure
phase must not share the same transition logic. The high-score entry is a
blocking UI step that writes the active table and then returns to the menu.
