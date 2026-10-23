# GitHub Pages deployment

The game is hosted at <https://kiringyj.github.io/openkawai/> directly from
[`KiringYJ/openkawai`](https://github.com/KiringYJ/openkawai) using GitHub Pages.

## Automatic deployment

The [Deploy openkawai workflow](../.github/workflows/deploy.yml) runs on every
push to this repository's `main` branch. It can also be started from
[GitHub Actions](https://github.com/KiringYJ/openkawai/actions/workflows/deploy.yml)
with **Run workflow**, selecting `main`.

Each run installs the lockfile with the Node version in `.node-version`, runs
`npm test`, and builds with `npm run build -- --base=/openkawai/`. It then uses
the official Pages actions to upload `dist/` and deploy it. Failed tests or
builds stop publication. Actions are pinned to full commit hashes, and runs
share a concurrency group to serialize deployment.

The repository's **Settings > Pages > Source** is **GitHub Actions**. The
workflow uses GitHub's built-in token and OIDC permissions; no extra secrets,
deploy keys, or cross-repository pushes are needed. `release.json` records the
published source commit.

To roll back, revert the unwanted source changes in a new `main` commit.

## Local production check

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build -- --base=/openkawai/
```

On PowerShell, use `npm.cmd` when forwarding Vite arguments: `npm.ps1` can
consume `--base` instead of passing it through. The regular `npm run build`
retains a portable relative base for other hosts.

The initial manual release remains in `KiringYJ/KiringYJ.github.io`'s
`gh-pages` history. Automatic releases now use this project's Pages site at
the same public URL.
