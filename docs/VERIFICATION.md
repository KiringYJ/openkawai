# Implementation verification

Verified on 2026-10-23 with the repository's Node 24.16.0 runtime.

## Automated checks

- `npm test`: 61 tests passed across four files (50 board/session rules,
  three asset-integrity checks, eight persistence checks).
- `npm run build`: passed, including `vue-tsc` checking of TypeScript and Vue
  templates and the Vite production bundle.
- `git diff --check`: passed.
- All 180 local animal images match their recorded SHA-256 digests.

## Browser checks

Checks used the actual interface, including the production build, without
editing hidden game state or injecting a prepared board.

- All five themes rendered their complete 36-animal settings preview without
  broken images. A reload retained the selected theme.
- A game started with 144 tiles, 36 identities, and four of each identity.
- Selection, right-click cancellation, blocked-pair feedback, and a legal
  two-turn route through the outer ring worked. The match awarded four points
  on the strong difficulty.
- Hint consumed one resource, highlighted two tiles, disabled repeated use,
  and cleared after a match.
- Switching theme during a game preserved the entire board, current
  selection, and score.
- Paid pause froze the clock; resuming changed the arrangement, spent one
  shuffle, and retained the chance kind.
- A natural strong-difficulty level-one run cleared all 72 pairs, opened
  chance rewards twice, and showed the clear score and bonus.
- Continuation retained two stars and the score, added the expected hint and
  shuffle resources, and dealt a fresh 144-tile level-two board. A level-two
  match awarded eight points and packed every column down. Manual shuffle
  preserved that hole pattern.
- Restart cancellation preserved progress; confirmation reset score, resources,
  level, and the board. Exhausted shuffle resources disabled shuffle/pause.
- A natural run with exhausted shuffle resources reached the no-move failure
  dialog. The name screen displayed ten ranks with a pending, unsaved row.
  Names normalized to the accepted vocabulary; Escape kept the name dialog
  open. Saving returned to the menu; the saved score survived a reload and
  appeared only in its difficulty table.
- Exit returned directly to the menu without a confirmation dialog.
- The skip link focused the board and arrow keys moved tile focus.
- At 1280 CSS pixels the board had no internal overflow. At 375 CSS pixels,
  the page had no horizontal overflow, the board scrolled horizontally without
  vertical overflow, and the settings dialog contained all 36 preview tiles.
- The final sidebar text used a dark foreground on its pale surface; the
  production page reported no console errors or warnings and no broken images.

## Evidence boundary

All eleven transforms and level/difficulty formulas have automated coverage.
The browser run above exercised levels one and two, not a complete eleven-level
campaign. Broad browser/device/screen-reader testing, player recognition-speed
testing, hosting, sound, and installable offline caching remain roadmap items.
These checks validate the implementation against the recorded rules; they do
not expand the original-game evidence boundary in `re/AUDIT.md`.
