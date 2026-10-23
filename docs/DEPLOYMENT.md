# GitHub Pages deployment

The game is hosted at <https://kiringyj.github.io/openkawai/>. Its generated
files live in the `openkawai/` directory on the `gh-pages` branch of
[`KiringYJ/KiringYJ.github.io`](https://github.com/KiringYJ/KiringYJ.github.io).
GitHub Pages publishes that branch's root. The branch contains a `.nojekyll`
marker so GitHub serves the prebuilt files directly.

This is a manual deployment. Publishing a new version requires an authorized
push to that deployment branch. Keep other hosted directories intact. The
personal website's source and draft content remain on their existing branches.
If a future website workflow publishes a full-site artifact, include the game
under `openkawai/` in that artifact before switching the Pages source.

## Build

From the game repository, use the pinned Node version and npm lockfile:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build -- --base=/openkawai/
```

On PowerShell, use `npm.cmd` when forwarding Vite arguments: the `npm.ps1`
wrapper can consume `--base` instead of passing it to the build command.
The regular `npm run build` retains the portable relative base for other hosts.

Check that `dist/index.html` references `/openkawai/assets/`. The generated
bundle must also use `/openkawai/tiles/` and `/openkawai/licenses/`. All artwork
and license files come from `public/`; no runtime image CDN is required.

## Publish

1. Clone the destination's `gh-pages` branch into a separate checkout, or fetch
   and fast-forward an existing clean deployment checkout.
2. Replace only its `openkawai/` directory with the contents of `dist/`.
   Include the game's `LICENSE` and `THIRD_PARTY_NOTICES.md` in that directory.
3. Record the source commit, Node version, build command, and public URL in
   `openkawai/release.json`. Preserve the root `.nojekyll` marker.
4. Review the complete diff and asset notices, stage the generated directory,
   and commit with hooks enabled. Push `gh-pages` without forcing history.
5. Wait for the destination repository's Pages build and deployment to succeed.
   Confirm the deployed commit matches the pushed commit.
6. Open the live URL, start a game, and check all five artwork themes and the
   in-game license links. Confirm generated JS/CSS and all 375 image files
   are reachable beneath `/openkawai/`.

The deployment commit preserves earlier versions. To roll back, restore the
previous deployment's `openkawai/` tree in a new commit and publish that commit.
