# Third-party notices

## Original game

**KAWAI 連連看 2004** and its associated artwork, audio, and other content are
the work of their original author. This repository is an independent,
unaffiliated reimplementation. It does not grant any licence to the original
game or its assets.

The archived author page and the original archive referenced by this project
are documented in [`re/scope.md`](re/scope.md). Obtain and use the original game
only through a lawful route.

## Bundled emoji artwork

The tile images in `public/tiles/` are unmodified upstream files. Exact source
paths, immutable revisions, and per-file SHA-256 hashes are recorded in
`public/tiles/manifest.json`.

### Microsoft Fluent Emoji

Fluent 3D artwork is from
[Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji),
copyright Microsoft Corporation and licensed under the MIT License. The
bundled files are pinned to commit
`1ffb34c752ecf5d402f04cfb4b392c77f57c54bc`. The full licence is available at
[`public/licenses/fluent-emoji-MIT.txt`](public/licenses/fluent-emoji-MIT.txt).

Fluent Animated artwork is from
[Microsoft Fluent Emoji Animated](https://github.com/microsoft/fluentui-emoji-animated),
copyright Microsoft Corporation and licensed under the MIT License. The
73 animated PNG files are pinned to commit
`daa0365c09795789ed2bc6e8b228c97736cb6669`. Coral and oyster use the static
Fluent 3D files and revision above because upstream provides no animations
for them. The full animated artwork licence is available at
[`public/licenses/fluent-emoji-animated-MIT.txt`](public/licenses/fluent-emoji-animated-MIT.txt).

### Google Noto Emoji

Noto Color Emoji artwork is from
[Google Noto Emoji](https://github.com/googlefonts/noto-emoji), copyright
Google, Inc., and licensed under the Apache License 2.0. The bundled animal
images are pinned to commit `e20cbc2bbec1926686be9f9bee7d1d2cfa1fea0e`.
Noto's separate flag-image exceptions do not apply to these animal images.
The applicable image licence is available at
[`public/licenses/noto-emoji-Apache-2.0.txt`](public/licenses/noto-emoji-Apache-2.0.txt),
with the upstream copyright notice at
[`public/licenses/noto-emoji-NOTICE.txt`](public/licenses/noto-emoji-NOTICE.txt).

### Twemoji

Twemoji graphics are copyright 2019 Twitter, Inc. and other contributors and
licensed under the Creative Commons Attribution 4.0 International License.
The bundled files come from
[jdecked/Twemoji v17.0.3](https://github.com/jdecked/twemoji/tree/v17.0.3),
commit `b6b55fef1e8636b540a6d016a4729ca8cdf2e60b`. The full graphics licence is
available at
[`public/licenses/twemoji-CC-BY-4.0.txt`](public/licenses/twemoji-CC-BY-4.0.txt).

### OpenMoji

All emojis designed by OpenMoji, the open-source emoji and icon project.
OpenMoji graphics are licensed under the Creative Commons
Attribution-ShareAlike 4.0 International License. The bundled files come from
[OpenMoji 17.0.0](https://github.com/hfg-gmuend/openmoji/tree/17.0.0), commit
`f9fc506a3f913be9897ab0181d611d4c910a4104`. The files have not been modified.
The full licence is available at
[`public/licenses/openmoji-CC-BY-SA-4.0.txt`](public/licenses/openmoji-CC-BY-SA-4.0.txt).

## Build and development dependencies

The project uses the following packages, installed from npm under their own
licences:

| Package | Licence | Role |
| --- | --- | --- |
| Vue | MIT | User-interface framework |
| Vuetify | MIT | Material Design component library |
| Material Design Icons (`@mdi/js`) | Apache-2.0 | Interface icons |
| Vite | MIT | Development server and build |
| Vite Vue plugin (`@vitejs/plugin-vue`) | MIT | Vue single-file component integration |
| TypeScript | Apache-2.0 | Type checking |
| Vue language tools (`vue-tsc`) | MIT | Vue-aware type checking |
| Node.js type definitions (`@types/node`) | MIT | Development type definitions |
| Vitest | MIT | Unit testing |

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
