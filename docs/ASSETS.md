# Asset policy and provenance

## Bundled tile art

The game ships 75 animal candidates in five interchangeable visual themes
from four independent libraries. Every level samples 36 distinct kinds.
Every theme uses the same stable IDs from `src/content/tile-kinds.ts`; changing
the theme never changes which tiles match. The 375 files are stored under
`public/tiles/`, so the built game makes no image request to a remote service.

The artwork comes from established open emoji projects. It is independent of
the original **KAWAI 連連看 2004** artwork, which remains excluded from this
repository.

| Theme | Upstream | Pinned revision | Licence |
| --- | --- | --- | --- |
| Fluent 3D | [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) | `1ffb34c752ecf5d402f04cfb4b392c77f57c54bc` | MIT |
| Fluent Animated | [Microsoft Fluent Emoji Animated](https://github.com/microsoft/fluentui-emoji-animated) | `daa0365c09795789ed2bc6e8b228c97736cb6669` | MIT |
| Noto Color Emoji | [Google Noto Emoji](https://github.com/googlefonts/noto-emoji) | `e20cbc2bbec1926686be9f9bee7d1d2cfa1fea0e` | Apache-2.0 |
| Twemoji | [jdecked/Twemoji](https://github.com/jdecked/twemoji/tree/v17.0.3) | `v17.0.3` (`b6b55fef1e8636b540a6d016a4729ca8cdf2e60b`) | CC BY 4.0 |
| OpenMoji | [OpenMoji](https://github.com/hfg-gmuend/openmoji/tree/17.0.0) | `17.0.0` (`f9fc506a3f913be9897ab0181d611d4c910a4104`) | CC BY-SA 4.0 |

The four-library full-body audit, exclusions, and visually distinct
representatives are recorded in [`ANIMAL_SELECTION.md`](ANIMAL_SELECTION.md).
`src/content/tile-catalog.json` is shared by the game and downloader, including
exact animated paths whose names can differ from the static library.

Fluent Animated uses 73 upstream animated PNGs (APNG). Upstream does not supply
coral or oyster animations, so those two files are unmodified Fluent 3D images
from the pinned revision above. The manifest identifies them with
`staticFallback: true` and records their exact static source URLs. Animated
files are retrieved through GitHub's immutable Git LFS media URLs. The game
also uses the Fluent 3D theme when the system prefers reduced motion.
The complete animated theme occupies 156,934,821 bytes, including its two
static fallbacks. Fluent 3D remains the default theme.

The Noto animals use the `2D/png` exports whose source artwork is covered by
the Apache 2.0 image licence in `2D/svg/LICENSE`. Noto's separate flag-image
exceptions do not apply because this pack contains no flags. The OpenMoji SVGs
and all other bundled images are byte-for-byte upstream files; this project has
not modified them.

Full licence texts and the Noto copyright notice are distributed in
`public/licenses/`; the required credits are in `THIRD_PARTY_NOTICES.md`. OpenMoji derivatives must retain the
CC BY-SA 4.0 licence and identify modifications. Twemoji requires attribution
under CC BY 4.0.

## Reproducible inventory

`public/tiles/manifest.json` records the upstream repository, immutable source
revision, source path, byte size, and SHA-256 digest for every image. Run the
dependency-free downloader from the repository root to reproduce the pack:

```sh
node scripts/download-tile-assets.mjs
```

The downloader retrieves only the pinned upstream files, validates PNG (including APNG) or SVG
signatures, fails on a missing or malformed response, downloads the complete
licence texts with trailing spaces normalized, and regenerates the manifest. It never substitutes placeholder
images.

## Excluded original-game assets

Do not commit extracted artwork, audio, fonts, executable files, or other
resources from the original game. This includes content under `Kawai2003/`,
`Kawai2004/`, `Kawai2005/`, `inputs/`, `compat/`, `re/.local/`, and
`re/assets/extracted/`. Raw investigation output belongs only in the ignored
reverse-engineering locations described in `re/assets/README.md`.
