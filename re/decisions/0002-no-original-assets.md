# 0002 — No original assets in the repository

- Date: 2026-10-22
- Status: accepted
- Supersedes: none

## Context

The game's visual identity is part of its appeal, but the artwork, audio, and
other resources remain the original author's work. The source-only stance of
`kawai-win11-compat` already treats binary redistribution as a separate,
rights-sensitive action. The web project needs a rule it can follow before any
asset pipeline exists.

## Decision

The repository contains no original game assets. The playable build uses an
original placeholder tile set rendered with CSS and text. Extracted assets, raw
captures, and full analysis snapshots stay under ignored local directories.

If a lawful asset route is established, prefer a user-supplied local pack with a
provenance manifest and per-file hashes. The built-in placeholders remain the
fallback.

## Consequences

- Contributors can run and test the project without obtaining the original.
- Screenshots and visual comparisons must be handled carefully; do not commit a
  substantial reproduction of the original art.
- A future pack loader needs validation and a clear "missing pack" path.
- Visual fidelity work is intentionally decoupled from rule fidelity work.
