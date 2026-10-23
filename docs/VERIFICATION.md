# Implementation verification

Latest hosting verification: 2026-10-24, using Node 24.16.0. Earlier
implementation browser checks below were recorded on 2026-10-23.

## GitHub Pages deployment

- Published <https://kiringyj.github.io/openkawai/> from source commit
  `dc0a3ae4333b2af25c332f878e0624eb6322276b`, built with
  `npm.cmd run build -- --base=/openkawai/`.
- `npm test`: 78 tests passed. The production build and whitespace check passed.
- All 375 image files in the deployment matched the source manifest hashes.
- Destination commit `169436fd84ddf1fcd3957ba8ccd852bdf22d4ade` is on the
  `gh-pages` branch of `KiringYJ/KiringYJ.github.io`. Its
  [Pages deployment](https://github.com/KiringYJ/KiringYJ.github.io/actions/runs/40001783180)
  completed successfully.
- The live release metadata and both JS/CSS bundles matched the locally
  verified build. All 375 image URLs and six artwork-license URLs returned
  successful responses; image response sizes matched the manifest.
- The live game opened and started a 144-tile Classic board with all 145
  images, including the chance animal, loaded successfully.

See [deployment](DEPLOYMENT.md) for the manual update procedure. These are
hosting checks; they do not repeat the complete gameplay matrix below.

## Automated checks

- `npm test`: 78 tests passed across four files, including per-level species
  sampling, seed replay, chance-kind scope, curation, asset integrity, untimed
  Zen sessions, and mode preference migration.
- `npm run build`: passed, including `vue-tsc` checking of TypeScript and Vue
  templates and the Vite production bundle.
- `git diff --check`: passed.
- All 375 local animal images match their recorded SHA-256 digests.

## Classic and Zen browser checks

These checks used the production preview and actual controls, without editing
hidden game state or injecting a prepared board.

- Classic's weak, strong, and super-strong difficulties started with the
  original 5:20, 3:45, and 2:40 countdowns and 8/5/5 starting resources.
- Zen selection survived a reload and hid the Classic difficulty controls.
  Its board displayed an untimed label and no countdown bar. Changing the
  next-game mode to Classic during Zen did not alter the current mode or
  display a running-timer warning. Restart retained Zen and reset the score,
  resources, and 144-tile board. Classic still showed its timer warning.
- Both mode buttons measured exactly 195 CSS pixels at 1280 × 720 and
  142.5 CSS pixels at 375 × 812.
- Zen rendered all five themes' 75 preview images and 144 board images at
  desktop and narrow widths. Switching themes preserved the board's complete
  kind/position signature and untimed state.
- A blocked Zen pair was rejected. A successful two-turn outer-ring match
  removed two tiles and awarded four points. Hint highlighted a legal pair;
  shuffle and paid resume each consumed a shuffle resource.
- A natural Zen run exhausted its shuffles and reached a no-move result after
  13 matches with 52 points. Confirming returned to the menu without name
  entry; Classic's strong leaderboard remained empty.
- Both modes fit 375 × 812, 844 × 390, 683 × 384, and 320 × 180 CSS viewports
  without page scrolling, with nonzero board area and visible actions. Zen
  was also checked at 1280 × 720. Temporary viewport overrides were reset.

Unit tests cover arbitrary elapsed ticks, Zen card rewards, level continuation,
restart, and final completion. This browser pass did not play a complete
eleven-level Zen campaign.

## Expanded-pool browser checks

These checks used the production preview with the 75-candidate catalog,
without editing hidden game state or injecting a prepared board.

- All five themes loaded all 75 preview images at desktop and 375 CSS pixels,
  without glyph fallbacks or horizontal overflow. The incomplete final preview
  row retained its exposed tile edge. Reload preserved the selected theme.
- The first level dealt 144 tiles: 36 distinct kinds with four copies each.
  The visible chance animal belonged to the selected set.
- Switching through all five themes preserved every tile's kind and position,
  the selected tile, and the score. Every theme loaded all 144 board images.
  Keyboard selection and right-click cancellation worked.
- A full level-one run cleared all 72 pairs and displayed the result dialog.
  Level two dealt a fresh 144-tile board with 36 kinds, four copies each, and
  a chance animal in that set. Five species observed at the end of level one
  were absent from the next deal, confirming a changed selection.
- Hint highlighted a legal pair, and matching it removed two tiles. Manual
  shuffle preserved the remaining multiset. Paid resume consumed one shuffle.
- Restart returned to a fresh 144-tile board with a different 36-kind set.
- Gameplay fit 1360 × 900, 375 × 812, 844 × 390, and 683 × 384 CSS viewports
  without page scrolling or clipping the outer ring.
- The browser reported no application console errors or warnings.

The four-library visual eligibility audit is recorded in
[`ANIMAL_SELECTION.md`](ANIMAL_SELECTION.md). Reduced-motion source selection
was reviewed in the component; this browser pass did not emulate that media
preference. Recognition-speed and low-end-device performance testing remain
separate roadmap work.

## Earlier fixed-pool browser checks

The following checks predate the expanded candidate pool. Current checks are
recorded separately above; these earlier runs are not new-pool evidence.

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
  Names normalized to the accepted vocabulary. Saving returned to the menu;
  the saved score survived a reload and appeared only in its difficulty table.
- Qualifying timeout runs confirmed that skipping or pressing Escape after
  typing a name returns to the menu without adding a record, including after
  reload. Explicit saving still persisted the score. The skip and save actions
  both fit the name dialog at 375 CSS pixels without horizontal overflow.
- Exit returned directly to the menu without a confirmation dialog.
- The skip link focused the board and arrow keys moved tile focus.
- The gameplay layout fit 16 CSS viewport sizes from 320 × 180 to
  2560 × 1440, including desktop, portrait, landscape, and the 539/540 and
  760/768 width boundaries. The page dimensions matched the viewport on both
  axes, the board had no internal overflow, all 144 tiles and the action row
  stayed visible, and the board's horizontal center differed by less than
  0.01 CSS pixels. The outer path ring and portrait tile proportions remained
  intact. These CSS sizes exercise zoom-equivalent layout constraints; the
  browser's zoom setting itself was not changed.
- With the full-cell outer ring retained, compact page/toolbars increased tile
  faces at 1280 × 720 from approximately 36.16 × 48.20 to 39.75 × 53 CSS pixels
  (about 10% in each dimension). The green frame follows the fitted board.
- At 375 CSS pixels, all five themes rendered 36 settings-preview tiles without
  broken images. Selection, a blocked pair, a successful outer-ring match,
  hint, shuffle, pause/resume, restart confirmation, and a natural timeout
  result dialog worked with the fitted board. The skip link and arrow keys
  moved focus without scrolling the page.
- A temporary local test entry denied access to `localStorage` before loading
  the real app. At 375 × 812, 667 × 375, and 320 × 180, the compact warning
  preserved a nonzero board area and all 144 tiles without page scrolling.
  The warning uses its own alert region. Routine gameplay messages and the
  remaining-pair counter are visually omitted; tile feedback, score, and a
  visually hidden live announcement remain.
  The test entry was removed after verification.
- The browser reported no console errors or warnings and no broken
  images.

## Evidence boundary

All eleven transforms and level/difficulty formulas have automated coverage.
The browser run above exercised levels one and two, not a complete eleven-level
campaign. Broad browser/device/screen-reader testing, player recognition-speed
testing, sound, and installable offline caching remain roadmap items.
These checks validate the implementation against the recorded rules; they do
not expand the original-game evidence boundary in `re/AUDIT.md`.
