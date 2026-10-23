---
id: RE-0005
title: The 800x600 HUD exposes score, level, two resources, pause/exit, chance, and a top-10 high-score flow
status: confirmed
confidence: high
target: KAWAI 連連看 2004 v1.01
environment:
  os: Windows 11 x64
  locale: zh-TW
evidence:
  - re/sessions/20261022-kawai2004-runtime.md
implementation:
  - src/ui/game-view.ts
---

## Question

What does the player see, and what happens after a round ends?

## Method

Captured the live 800 × 600 client while playing, after a level clear, and after
a time-out. The window was the original game under DxWnd, not a reconstructed
screen.

## Observations

1. The game client is **800 × 600**. The windowed outer form is 816 × 639.
2. HUD elements:
   - top-left: zero-padded score, e.g. `000000`, `000004`, `001448`;
   - top-centre: level number and name, e.g. `第01關 一板一眼`,
     `第02關 石沉大海`;
   - top-right: an orange circular-arrow resource and a blue star/flower
     resource, both displayed as three-digit counts (e.g. `005`, `009`);
   - `暫停` (pause) and `離開` (exit) buttons;
   - right column: `機會` chance panel with a tile icon and three star slots;
   - bottom-right: `KAWAI 連連看 2004`.
3. The playfield is a 16 × 9 tile grid with a one-tile border of empty
   background. The grid starts at client `(53, 106)` with a 40 × 50 cell step.
4. On a level-1 time-out, the game opened a `挑戰失敗` overlay:
   `時間已用完  無牌可消除`, followed by a “click to continue” instruction.
5. Continuing led to a top-10 high-score table:
   - columns `NO`, `NAME`, `SCORE`, `LEVEL`;
   - the new row showed score `4`, level `01`;
   - the footer read `CONGRATULATION` and
     `KEY IN YOUR NAME AND PRESS ENTER TO CONTINUE`.
6. A level clear instead showed `恭喜過關` with `繼續挑戰下一關` and a
   “click in this window” prompt; the next level started after the click.
7. The game writes a high-score file under the Windows directory; the string
   `\kawai2004.hst` is present in the binary. The record format is decoded in
   RE-0014 and the qualification/name rules in RE-0019.

## Interpretation

The UI is a single manually drawn VB form, not separate screens or controls.
The stable contract for a reimplementation is:

```text
800x600 canvas
16x9 playfield, one-cell border, 40x50 visual cell step
HUD: score / level / search resource / reshuffle resource / pause / exit
right panel: chance kind + three star slots
overlays: time-out, level-clear, card bonus, top-10 name entry
```

The score is zero-padded to six digits. The level name comes from a fixed
11-entry table.

## Confidence and limits

High for the visible layout, score/level display, overflow, and high-score
columns. The file format, difficulty tables, tie ordering, and name-entry rules
are resolved in RE-0014/RE-0019.

## Open questions

- Exact high-score file layout and directory: resolved in RE-0014 (660 bytes,
  three contiguous 10-entry tables, virtualized Windows path).
- Separate high-score tables per difficulty: resolved in RE-0014 (three tables).
- Difficulty effects: changes the timer, score multiplier, starting resources,
  and card-pick table; the board composition and chance kind are otherwise the
  same (RE-0008, RE-0011, RE-0012).
- Search/reshuffle icons and costs: resolved in RE-0013 (A hint, B shuffle, one
  per use; start 5, or 8 at 弱; hint +1 per continue, shuffle +1 except at 弱;
  card rewards add more).
- Pause cost: RE-0017 (with the v1.01 README) shows pause requires B > 0;
  entry freezes the timer, and the resume click shuffles and spends one B.
  At B = 0 the pause click is ignored. The chance kind is not re-rolled.

## Implementation impact

The current shell already uses an 800 × 600-ish responsive board, but the
prototype HUD is not the original layout. The rule gaps that blocked matching
the level table and high-score flow are closed; the remaining work is UI and
state-model implementation.
