# Findings

One claim per file. A finding is the bridge between an observation and a code
change; it is not a general notes page.

## Index

| ID | Title | Status | Confidence | Implementation |
| --- | ----- | ------ | ---------- | -------------- |
| [RE-0001](RE-0001-board-runtime-layout.md) | Board is an 18×11 array with 6-byte cells over a 16×9 playfield | confirmed | high | `src/core/board.ts` |
| [RE-0002](RE-0002-matching-and-path-rule.md) | Matching allows ≤2 orthogonal turns and the outer border | confirmed | high | `src/core/board.ts` |
| [RE-0003](RE-0003-score-time-and-level-flow.md) | Pair score, timer, and level-flow observations | superseded by RE-0008 | medium | `src/game/session.ts` |
| [RE-0004](RE-0004-chance-stars-and-card-bonus.md) | Chance tile grants stars; three stars open an 18-card bonus | superseded by RE-0012 | medium | `src/game/session.ts` |
| [RE-0005](RE-0005-ui-and-high-score-flow.md) | 800×600 HUD and top-10 high-score flow | confirmed | high | `src/ui/game-view.ts` |
| [RE-0006](RE-0006-function-map.md) | Function map: startup, vtable methods, paint, move finder, card deck | confirmed | high | — |
| [RE-0007](RE-0007-level-start-dispatcher.md) | Level start sets 225 s, score, resources, then calls three form methods | confirmed | high | `src/game/session.ts` |
| [RE-0008](RE-0008-score-and-time-formulas.md) | Exact difficulty/level score, per-match timer bonus, and per-level time limits | confirmed | high | `src/game/session.ts`, `src/content/layouts.ts` |
| [RE-0009](RE-0009-level-clear-bonus.md) | Level clear drains remaining time into score plus a base bonus; final-level resource branch | confirmed | high | `src/game/session.ts` |
| [RE-0010](RE-0010-level-continuation.md) | Continue advances level, applies the next timer, adds +1 hint (and +1 shuffle except 弱), keeps score | confirmed | high | `src/game/session.ts` |
| [RE-0011](RE-0011-level-table-and-final-clear.md) | 11 full levels, linear timer/resource table, final resource clear bonus | confirmed | high | `src/game/session.ts`, `src/content/layouts.ts` |
| [RE-0012](RE-0012-chance-card-rewards.md) | Chance stars, 1-3 picks, shuffled 18-card reward deck, free shuffle on close | confirmed | high | `src/game/session.ts` |
| [RE-0013](RE-0013-hint-and-shuffle-resources.md) | HUD resources are hint (A) and shuffle (B); one use each | confirmed | high | `src/game/session.ts` |
| [RE-0014](RE-0014-high-score-file.md) | High-score file is 660 bytes of three contiguous 10-entry tables | confirmed | high | `src/game/session.ts` |
| [RE-0015](RE-0015-vtable-and-move-finder.md) | Vtable slot map, move finder/hint endpoints, level dispatch, auto-shuffle branch | confirmed | high | `src/core/board.ts`, `src/game/session.ts` |
| [RE-0016](RE-0016-failure-and-high-score-flow.md) | Failure overlay, high-score name entry, immediate save, return to menu | confirmed | high | `src/game/session.ts`, `src/ui/game-view.ts` |
| [RE-0017](RE-0017-pause-exit-menu-flow.md) | Pause requires B>0; entry freezes timer; resume spends 1 B and reshuffles; exit abandons | confirmed | high | `src/game/session.ts`, `src/ui/game-view.ts` |
| [RE-0018](RE-0018-level-rearrangement-methods.md) | All eight level transforms are deterministic row/column packs; L4/L6 single-axis, L10/L11 combined; card-screen deferral | confirmed | high | `src/core/board.ts`, `src/game/session.ts` |
| [RE-0019](RE-0019-high-score-qualification-and-name-entry.md) | High-score entry needs a score above 10th place; names are 16 bytes of A-Z/space | confirmed | high | `src/game/session.ts`, `src/ui/game-view.ts` |

Add a row when a finding is accepted. Keep `unknown` findings out of the index
until there is enough evidence to state a question precisely.

## Template

Copy [`_template.md`](_template.md). Use the next free `RE-NNNN` identifier.

## Status values

- `open` — investigation in progress; do not implement yet.
- `confirmed` — reproducible and ready to implement.
- `inferred` — useful but provisional; implement behind a named constant.
- `rejected` — disproved; keep for history and link the superseding finding.
- `superseded` — replaced by a later finding; keep the observations, link the superseding finding.
