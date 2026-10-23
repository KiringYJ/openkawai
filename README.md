# openkawai

A browser reimplementation of **KAWAI 連連看 2004**, with a Vue + Vuetify
interface and an independently implemented, deterministic TypeScript game core.

The confirmed gameplay in [`re/RULESET.md`](re/RULESET.md) is now implemented:
36 animal kinds, a 16 × 9 board, 11 levels, three difficulties, finite
resources, chance cards, and browser-local best records. The artwork is from
five open emoji collections, independent of the original game's assets.

[繁體中文](#繁體中文) · [Architecture](docs/ARCHITECTURE.md) ·
[Roadmap](docs/ROADMAP.md) · [Asset credits](docs/ASSETS.md) ·
[Verification](docs/VERIFICATION.md) · [Rule evidence](re/README.md)

## Run locally

Use Node.js 22.12+ or 24+. `.node-version` selects Node 24.16.0.

```sh
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). For a production build:

```sh
npm run build
npm run preview
```

The build is a static site in `dist/`, including all 180 tile images, credits,
and artwork licences. There is no backend or external image dependency at
runtime. Serve it over HTTP; opening `index.html` directly is not supported.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite development server on port 5173. |
| `npm run typecheck` | Check TypeScript and Vue templates with `vue-tsc`. |
| `npm test` | Run rule, persistence, and asset-integrity tests. |
| `npm run test:watch` | Re-run unit tests while editing. |
| `npm run build` | Type-check and produce the static site. |
| `npm run preview` | Serve the production build on port 4173. |

TypeScript is pinned to 6.0.3 because the current `vue-tsc` needs the
JavaScript compiler API that TypeScript 7 does not expose. The Vue, Vuetify,
and tooling versions are recorded in `package.json` and `package-lock.json`.

## Play

- Match identical animals along an empty orthogonal path with at most two
  turns. The empty ring around the board is traversable.
- Each board starts with four copies of each of the 36 kinds: 144 tiles,
  or 72 pairs. Each level has its own rearrangement rule.
- Choose 弱, 強, or 超強. Matching adds points and time; clearing a level
  adds the confirmed time bonus and carries score/resources to the next level.
- Hints and shuffles are limited. A hint remains active until a match. A board
  with no legal moves automatically spends a shuffle; without one, the run ends.
- Pausing requires a shuffle resource. Resuming spends one and reshuffles.
- Match the current chance animal to earn a star. Three stars open an
  18-card reward screen; stars carry across levels until the cards are used.
- Completed or failed runs can enter a separate top-ten table per difficulty.
  Registration is optional: skip or dismiss the name dialog to return to the
  menu without saving. Names accept A–Z and spaces, up to 16 characters;
  blank names are allowed.

Keyboard: arrows move between tiles, Enter/Space selects, H hints, S shuffles,
P pauses/resumes, R restarts, and Escape cancels selection. Right-click also
cancels. Small viewports scroll the board horizontally to keep tiles readable.

## Choose your emoji style

Open **設定** to switch between **Fluent 3D**, **Fluent Flat**,
**Noto Color Emoji**, **Twemoji**, and **OpenMoji**. All five use the exact
same 36 animal identities. Switching styles preserves positions, selection,
score, and progress. Settings include a preview of all 36 animals and a
default difficulty for the next new game.

Settings and best records use this browser's `localStorage`. They persist
across reloads; an unfinished run does not. If storage is unavailable, the
game works in memory and shows a notice. Opening settings or instructions
during play does not stop the timer. Elapsed time also counts in background
tabs. Use the game's paid pause when taking a break.

## Scope and evidence

[`re/RULESET.md`](re/RULESET.md) describes the target rules;
[`re/AUDIT.md`](re/AUDIT.md) distinguishes direct static evidence from live
observations. Rule tests establish this implementation's behavior, rather
than claiming that every possible original-game state was compared live.

Web adaptations are deliberate: seeded uniform shuffles replace the original
VB random sequence, artwork comes from open emoji projects, score tables use
browser storage instead of a Windows `.hst` file, score registration can be
skipped, and lowercase name input is normalized to uppercase. Original audio,
original artwork, and exact animation timings are outside scope. A service
worker, saved-run restore, and custom asset-pack upload are not implemented.

## Repository

```text
src/core/       Pure board, paths, rearrangements, and seeded RNG.
src/game/       Session state machine and high-score rules.
src/content/    Levels, animal identities, and emoji themes.
src/config/     Validated settings and resilient browser storage.
src/ui/         Vue + Vuetify app, board, artwork, and settings.
public/tiles/   180 locally bundled images and a provenance/hash manifest.
public/licenses/  Full artwork licences and notices.
tests/          Rule, storage, and asset-integrity tests.
re/             Evidence and clean-room investigation records.
docs/           Architecture, roadmap, and asset policy.
```

Agent policy is generated by
[`agent-workbench`](https://github.com/KiringYJ/agent-workbench).
`AI_AGENT_GUIDE.md` is managed; current project context belongs in
`AI_AGENT_PROJECT.md`. The separate
[`kawai-win11-compat`](https://github.com/KiringYJ/kawai-win11-compat) project
handles running the original Windows game.

## Licences

Source code is MIT-licensed. The bundled artwork has its own MIT,
Apache-2.0, CC BY 4.0, or CC BY-SA 4.0 licence; see
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and the in-game credits.
The original game and its assets belong to their original author. This is an
independent, unaffiliated reimplementation with no original binary, artwork,
music, fonts, or runtime DLLs included.

## 繁體中文

**openkawai** 是《KAWAI 連連看 2004》的瀏覽器重寫版，介面使用 Vue 與
Vuetify。依據專案已確認的規則，實作 16 × 9 棋盤、36 種動物各四張、
11 關消牌變形、三種難度、計時與計分、有限提示／洗牌、機會翻牌及最佳紀錄。

在「設定」可切換 Fluent 3D、Fluent Flat、Noto Color Emoji、Twemoji、
OpenMoji，預覽全部 36 種動物。更換圖案不會改變棋盤或進度。五套共 180 張
圖檔隨專案附上；設定與排行榜保存在目前瀏覽器，未完成的遊戲不會保存。

```sh
npm ci
npm run dev
```

程式碼採 MIT 授權，圖案依各圖庫授權使用並附上來源及完整授權。本專案
不含原作執行檔、擷取素材、音樂或反編譯程式碼。
