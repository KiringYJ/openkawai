# Asset policy

## What is in this repository

Only original, code-generated presentation:

- CSS-drawn tile faces and a text glyph per kind.
- SVG connection paths.
- The interface shell, typography, and colour system.

There is no original game artwork, music, sound effect, font, executable, or
extracted resource in the repository.

## What must stay out

Do not commit:

- `Kawai2003/`, `Kawai2004/`, `Kawai2005/`, `inputs/`, or `compat/` contents;
- extracted images, sprites, MIDI, WAV, or other game resources;
- decompiled code or long pseudocode dumps;
- third-party runtime DLLs or installers.

These paths are ignored by `.gitignore`. Raw investigation output belongs under
`re/.local/` or `re/assets/extracted/`, both ignored.

## Placeholder tiles

`src/content/tile-kinds.ts` defines twelve original placeholder kinds using
Chinese characters and hue values. They exist to make the rules playable without
borrowing the original visual identity. They are not a claim about the original
tile set.

## Future local asset packs

If a lawful route to use extracted assets is established, prefer a local pack
that the user supplies at runtime rather than committing the assets:

```text
public/assets/packs/<pack-id>/
  manifest.json      # id, name, provenance, hashes, tile mapping
  tiles/             # user-supplied images
```

Requirements for such a pack:

1. A provenance record explaining where the assets came from and the legal
   basis for use.
2. Per-file SHA-256 hashes in the manifest.
3. A fallback to the built-in placeholder set when the pack is missing or
   invalid.
4. No pack content in Git history or release artifacts unless redistribution
   rights are explicitly documented.

The pack loader is not implemented in M0. This section defines the boundary
before the feature exists.
