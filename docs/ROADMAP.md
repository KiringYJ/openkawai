# Roadmap

## Implemented

- [x] Pure TypeScript board, two-turn paths, outer ring, and seeded RNG.
- [x] Evidence-backed 16 × 9 board and 36 kinds ×4.
- [x] Eleven levels with the confirmed stable packing transforms.
- [x] Three difficulty tables, score/time formulas, and clear/final bonuses.
- [x] Finite hint/shuffle resources, cached hints, no-move handling, paid pause.
- [x] Chance stars, weighted card picks, rewards, and deferred transforms.
- [x] Menu, continuation, completion/failure, name entry, and best records.
- [x] Vue + Vuetify presentation, keyboard operation, centered viewport-fitted board.
- [x] Exact selected 36 animals in five player-selectable emoji themes.
- [x] 180 local images with pinned sources, full licences, and hash checks.
- [x] Persistent settings and per-difficulty top-ten records.
- [x] Unit tests for rules, persistence, and bundled art.

## Further verification and release work

- [ ] Longer player sessions to assess animal recognition speed and difficulty.
- [ ] Broader browser, screen-reader, touch-device, and low-end hardware testing.
- [ ] Static hosting deployment and release packaging.
- [ ] Final review of all distribution notices and public-facing naming.

## Possible extensions (not implemented)

- Saved-run restore, replay/import/export, and reproducible seed controls.
- Service worker and installable/offline application support.
- Validated, user-supplied custom art packs.
- Independently licensed sound effects and additional presentation polish.

The currently bundled site is self-contained after download, but it does not
register an offline cache. Original artwork/audio, exact original animations,
and the original VB random sequence remain outside this implementation.

## Non-goals

- Wrapping or redistributing the original executable or extracted assets.
- Shipping third-party runtime DLLs or modifying the Windows launcher.
- Depending on a backend, account system, or remote image service to play.
