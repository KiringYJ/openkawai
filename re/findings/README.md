# Findings

One claim per file. A finding is the bridge between an observation and a code
change; it is not a general notes page.

## Index

| ID | Title | Status | Confidence | Implementation |
| --- | ----- | ------ | ---------- | -------------- |
| [RE-0001](RE-0001-board-runtime-layout.md) | Board is an 18×11 array with 6-byte cells over a 16×9 playfield | confirmed | high | `src/core/board.ts` |
| [RE-0002](RE-0002-matching-and-path-rule.md) | Matching allows ≤2 orthogonal turns and the outer border | confirmed | high | `src/core/board.ts` |
| [RE-0003](RE-0003-score-time-and-level-flow.md) | Pair score scales with level; each match adds 4 seconds | inferred | medium | `src/game/session.ts` |
| [RE-0004](RE-0004-chance-stars-and-card-bonus.md) | Chance tile grants stars; three stars open an 18-card bonus | confirmed | medium | `src/game/session.ts` |
| [RE-0005](RE-0005-ui-and-high-score-flow.md) | 800×600 HUD and top-10 high-score flow | confirmed | high | `src/ui/game-view.ts` |
| [RE-0006](RE-0006-function-map.md) | Function map: startup, 11 level routines, paint, high-score I/O | inferred | medium | — |

Add a row when a finding is accepted. Keep `unknown` findings out of the index
until there is enough evidence to state a question precisely.

## Template

Copy [`_template.md`](_template.md). Use the next free `RE-NNNN` identifier.

## Status values

- `open` — investigation in progress; do not implement yet.
- `confirmed` — reproducible and ready to implement.
- `inferred` — useful but provisional; implement behind a named constant.
- `rejected` — disproved; keep for history and link the superseding finding.
