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

## Local Unicode player names (2026-10-24)

These checks used the current local source and an isolated storage namespace;
the normal browser records/preferences were not used for test writes.

- `npm test`: 91 tests passed across four files. `npm run build` (including
  template type checking) and `git diff --check` passed. Regression coverage
  includes Unicode/case round-trips, canonical combining characters, joined
  and flag emoji, 16/17 graphemes, excessive raw input, controls/invisible
  formatting, direct saves, legacy padded names, and malformed stored rows.
- A natural Classic run earned nine points and timed out. The actual record
  form accepted `KiringYJ`, Chinese with mixed-case Latin and punctuation,
  composed emoji, and literal markup. The decomposed input remained raw while
  its preview used NFC. Counters reported 3 for `é👩🏽‍💻🇹🇼`, 16 for sixteen
  family emoji, and 17 for seventeen. The last case disabled save and pressing
  Enter left the form open.
- Saving `小明KiringYJ🐱` and reloading preserved its exact case and characters.
  Literal `<b>小明</b>` created no HTML elements in player cells. Arabic/Latin
  names had bidirectional isolation; controls and an invisible-only fixture
  became safe text/anonymous names. Legacy padded names displayed without
  padding.
- Desktop and 375px layouts kept long CJK/emoji names within the table and
  headers on one line. The narrow form and saved leaderboard had no horizontal
  overflow. The browser logged no application errors or warnings.
- Physical IME candidate interaction was not exercised by DOM automation;
  the input model stays raw, and only derived preview/domain values are
  normalized. The temporary fixture and its namespaced data were removed.

## Local typography and color contract (2026-10-24)

These checks cover the shared roles in [`DESIGN.md`](../DESIGN.md) and the
current local source, not the hosted release above.

- Browser computed styles confirmed one font stack; 24px titles, 16px section
  labels/field values, 14px prose/buttons/tables, and 12px metadata/help. The
  brand remains 18px/600. Game values use 24px or the documented compact 18px
  profile; a natural timeout result used the 32px score role and 14px unit.
- Menu, settings, rules, credits, difficulty tabs, pause, restart confirmation,
  timeout result, and record-entry dialogs were inspected. Record headers use
  weight 600; empty cells remain regular/centered; selected tabs retain white
  text, green fill, and a check icon. Tables use tabular figures. The pending
  record was skipped without saving.
- Normal, muted, and accent text pairs meet AA contrast. Muted text measures
  5.65:1 on white and 5.26:1 on the page background. Colors use the shared
  Vuetify palette; opaque text and themed dividers were checked separately.
- All five artwork packs rendered 75 preview images and all 142 remaining
  board images after loading. The original Fluent 3D preference was restored.
- Selection/cancellation, a blocked pair, an outer-ring match, hint, shuffle,
  paid pause/resume, and restart cancellation worked through visible controls.
  The run reached timeout naturally and opened a qualifying record-entry form.
- At 1280x720, 375x812, 667x280, 960x540, and 320x180 CSS viewports, the game
  had no page/board overflow, all action buttons fit, and horizontal board
  centering error was below 0.01px. A temporary storage-denial entry also kept
  the full board within its bounds at 320x180; that entry was removed.
- An independent source review covered the type/color integration and resolved
  table-header weight and numeric-alignment omissions. Chance-card typography
  was source-reviewed through the shared roles; reward draws were not replayed
  in this styling pass. Earlier game-rule checks remain recorded below.
- `npm test`: 78 tests passed. `npm run build` and `git diff --check` passed.

## Local mouse controls and rules dialog (2026-10-24)

These checks used the current local source. The hosted build documented above
predates these interface changes.

- The rules dialog uses one font family and 14px body text, including the list,
  bold lead-ins, and mouse instructions, at desktop and 375px widths.
- Left-click selected a tile and right-click cleared it. A blocked interior
  pair retained all 144 tiles. A legal two-turn outer-ring pair removed two
  tiles; matching the on-screen hint removed another pair and increased score.
- With a tile selected, H, S, P, R, Escape, all four arrow keys, Enter, and
  Space left the selection, score, resources, tile count, and dialog state
  unchanged. P also left the pause dialog open. All tile buttons have a
  negative tab index, and no gameplay shortcut hints remain.
- The on-screen hint and shuffle buttons consumed their resources. Pausing
  and resuming through buttons spent one shuffle on resume. Cancelling a
  restart preserved progress; confirming reset score, resources, and the
  144-tile board.
- All five themes rendered 144 board images and 75 preview images after
  loading. Theme changes preserved tile positions, identities, and selection;
  the original theme preference was restored afterward.
- At 1280x720, 375x812, 667x280, and 960x540 CSS viewports, the board and its
  outer ring fit without page scrolling. Centering error within the board's
  available area was below 0.01px on both axes.
- `npm test`: 78 tests passed. `npm run build` and `git diff --check` passed.

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
- Before free deadlock recovery was added, a natural Zen run exhausted its
  shuffles and reached a no-move result after
  13 matches with 52 points. Confirming returned to the menu without name
  entry; Classic's strong leaderboard remained empty.
- Both modes fit 375 × 812, 844 × 390, 683 × 384, and 320 × 180 CSS viewports
  without page scrolling, with nonzero board area and visible actions. Zen
  was also checked at 1280 × 720. Temporary viewport overrides were reset.

Unit tests cover arbitrary elapsed ticks, Zen card rewards, level continuation,
restart, and final completion. This browser pass did not play a complete
eleven-level Zen campaign.

## Zen deadlock recovery

The 2026-10-24 update lets Zen automatically reshuffle for free when a match
leaves no legal pair and no shuffle resources remain.

- A real deadlock fixture failed before the change by entering `lost` with
  zero shuffles. Regression cases now cover 5, 1, and 0 remaining shuffles,
  resource accounting, refreshed legal hints, and clearing the remaining board.
  Manual shuffling still requires a resource. Classic no-move loss tests pass.
- `npm test` passed all 95 tests, and `npm run build` passed.
- A production-preview Zen run spent four manual shuffles and its last shuffle
  on resume. Its fifteenth match left no legal pair; the board automatically
  reshuffled with 114 tiles and 15 legal pairs, still showing zero shuffles
  and no result dialog. A subsequent match succeeded.
- Rules were readable at 1280 by 720 and 375 by 812. All five themes rendered
  without broken images at both sizes and preserved the board signature.
  Gameplay also fit 844 by 390, 683 by 384, and 320 by 180 without page
  scrolling. Blocked pairs, right-click cancellation, hints, paid pause,
  restart, and saved mode preference were checked through actual controls.

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
