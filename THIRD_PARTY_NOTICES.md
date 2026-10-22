# Third-party notices

## Original game

**KAWAI 連連看 2004** and its associated artwork, audio, and other content are
the work of their original author. This repository is an independent,
unaffiliated reimplementation. It does not grant any licence to the original
game or its assets.

The archived author page and the original archive referenced by this project
are documented in [`re/scope.md`](re/scope.md). Obtain and use the original game
only through a lawful route.

## Build and development dependencies

The project uses the following packages, installed from npm under their own
licences:

| Package    | Licence | Role                         |
| ---------- | ------- | ---------------------------- |
| Vite       | MIT     | Development server and build |
| TypeScript | Apache-2.0 | Type checking             |
| Vitest     | MIT     | Unit testing                 |

Exact versions are pinned in `package-lock.json`. Their licence texts are
distributed inside `node_modules/` by the packages themselves and are not
copied into this repository.

## Fonts

No font files are bundled. The interface uses the operating system's serif and
sans-serif fallbacks, including Noto, PingFang, Microsoft JhengHei, and Songti
where available.

## Generated agent workspace

`AI_AGENT_GUIDE.md`, the thin agent entrypoints, `.agents/`, `.claude/`, and
`.codex/` are generated from
[`KiringYJ/agent-workbench`](https://github.com/KiringYJ/agent-workbench) (MIT).
Project-specific context is maintained in `AI_AGENT_PROJECT.md`.
