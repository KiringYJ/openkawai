# 0001 — Vue and Vuetify presentation

- Date: 2026-10-23
- Status: accepted (explicit project-owner request)
- Supersedes: only the framework-free presentation choice in
  `re/decisions/0001-clean-room-web-reimplementation.md`
- The fixed animal inventory below is superseded by
  [`0002-expanded-animal-pool.md`](0002-expanded-animal-pool.md).

## Decision

Use Vue 3 and Vuetify 4 for the browser interface. Keep the independent
TypeScript core and session free of framework/DOM dependencies. Vuetify
components provide controls, feedback, dialogs, and navigation; the board
uses a CSS grid and SVG paths with Vuetify buttons.

Use the selected 36 animal identities in the five requested emoji collections.
Bundle licensed art locally, record immutable source revisions/hashes, and
let players change styles without changing game identity or progress.

## Dependencies

Vue, Vuetify, and SVG Material Design Icons supply the requested UI stack.
`@vitejs/plugin-vue` compiles single-file components, and `vue-tsc` checks both
TypeScript and templates. Node type declarations cover build configuration and
asset-integrity tests. No state-management library or router is needed.

TypeScript 6.0.3 is the compatible compiler pin: `vue-tsc` 3.3.13 resolves
`typescript/lib/tsc` and uses its JavaScript compiler API, while TypeScript
7.0.2 does not export that path. This constraint is explicit and can be lifted
when the Vue checker supports the newer compiler.

## Web adaptations

Browser-local settings and score tables replace Windows-file persistence.
Lowercase name input is normalized to uppercase. Narrow layouts scroll the
board to retain readable tile sizes. Settings and instructions do not pause
the running timer; the game's paid pause retains the confirmed resource rule.
These presentation choices leave the recorded clean-room and asset boundaries
in force.

The uppercase-name choice above was superseded for web player names on
2026-10-24; the original sentence remains as historical decision text. Current
web names preserve case; blank names remain allowed. Other names may contain up
to 16 user-perceived characters (grapheme clusters) and support safe Unicode,
including Chinese, mixed case, emoji, and punctuation. Unsafe invisible/control
formatting is stripped before plain-text display. Older padded Latin records
remain compatible.
