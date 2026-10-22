# 0001 — Clean-room web reimplementation in TypeScript

- Date: 2026-10-22
- Status: accepted
- Supersedes: none

## Context

The original is a Windows build from the mid-2000s. The sibling project
`kawai-win11-compat` already solves the "run the original on Windows 11"
problem with a source-only launcher. The remaining goal is a portable,
maintainable web version that can be studied, modified, and preserved.

Three routes were considered:

1. Wrap the original executable with WebAssembly or a remote runtime.
2. Recreate the game in a general-purpose engine.
3. Reimplement the observable rules in a small web application, using the
   original only as a behavioural reference.

## Decision

Route 3. Build a clean-room web reimplementation with Vite + TypeScript and no
UI framework. Keep the rules in `src/core/` and `src/game/`, independent of the
DOM, so they can be tested and ported. Record observations in `re/` before
changing a rule.

## Consequences

- The project can ship as static files without the original binary.
- Fidelity depends on the quality of the evidence log; provisional constants
  must be labelled.
- The implementation must resist copying decompiled code or original assets.
- A future renderer or platform can reuse the core without rewriting the game.
- The compatibility launcher remains a separate project with a different
  concern (running the original), not a dependency of this one.
