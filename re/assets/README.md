# Assets

This directory documents asset discoveries. It does not store original assets.

## Policy

- The game's artwork, audio, fonts, and data tables remain the original author's
  property.
- Extracted content goes under `re/assets/extracted/`, which is ignored by Git.
- Tracked files may describe an asset's identity, dimensions, format, and
  provenance, but not reproduce it.
- The web build uses original placeholders until a lawful distribution or
  user-supplied pack route exists.

## Manifest fields

For each discovered asset, record:

| Field        | Meaning |
| ------------ | ------- |
| `id`         | Stable local identifier. |
| `source`     | Archive-relative path or resource identifier. |
| `format`     | Container and codec/type, if known. |
| `dimensions` | Pixels for images; duration for audio. |
| `sha256`     | Hash of the extracted bytes. |
| `usage`      | Menu, board, tile face, effect, music, or unknown. |
| `notes`      | What was observed; no binary reproduction. |

## Extraction output

```text
re/assets/extracted/    # ignored
  manifest.json
  ...
```

Do not move extracted files into `public/`, `src/`, or a release artifact. A
future local pack loader should read a user-supplied directory at runtime.
