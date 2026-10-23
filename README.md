# openkawai

A browser reimplementation of **KAWAI 連連看 2004**, with a Vue + Vuetify
interface and an independently implemented, deterministic TypeScript game core.

The game implements the rules in [`re/RULESET.md`](re/RULESET.md) with a
deliberate animal-pool adaptation: each level randomly selects 36 kinds from
75 candidates. It retains a 16 × 9 board, 11 levels, finite resources, and
chance cards. Classic mode (經典模式) offers the original three difficulties and
browser-local best records; Zen mode (禪意模式) has no time limit. The artwork is from
four independent open emoji libraries, with five selectable themes, independent
of the original game's assets.

[Play online](https://kiringyj.github.io/openkawai/) ·
[繁體中文](#繁體中文) · [Architecture](docs/ARCHITECTURE.md) ·
[Roadmap](docs/ROADMAP.md) · [Asset credits](docs/ASSETS.md) ·
[Verification](docs/VERIFICATION.md) · [Rule evidence](re/README.md)

To play the original KAWAI games on Windows 11, see
[`kawai-win11-compat`](https://github.com/KiringYJ/kawai-win11-compat) for
compatibility tools and local setup instructions for the 2003, 2004, and 2005
editions. The original game files must be obtained separately.

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

The build is a static site in `dist/`, including all 375 tile images, credits,
and artwork licences. There is no backend or external image dependency at
runtime. Serve it over HTTP; opening `index.html` directly is not supported.

The hosted game is published at
[`kiringyj.github.io/openkawai/`](https://kiringyj.github.io/openkawai/) using
this repository's GitHub Pages site.
Pushes to `main` automatically publish a new version after tests and the
production build pass. See [deployment](docs/DEPLOYMENT.md) for the workflow
and recovery procedure.

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
- Each level randomly selects 36 distinct animal kinds from 75 candidates.
  Each board starts with four copies of each selected kind: 144 tiles,
  or 72 pairs. Each level has its own rearrangement rule.
- Choose Classic mode for 弱, 強, or 超強. Matching adds points and time;
  clearing a level adds the confirmed time bonus and carries score/resources
  to the next level.
- Choose Zen mode to play all 11 levels without a countdown or timeout.
  It uses the strong difficulty's match scores and starting resources, with
  no time bonus. Time cards become hint or shuffle rewards. Hints, shuffles,
  pause costs, and no-move failures still apply.
- Hints and shuffles are limited. A hint remains active until a match. A board
  with no legal moves automatically spends a shuffle; without one, the run ends.
- Pausing requires a shuffle resource. Resuming spends one and reshuffles.
- Match the current chance animal to earn a star. Three stars open an
  18-card reward screen; stars carry across levels until the cards are used.
- Completed or failed Classic runs can enter a separate top-ten table per difficulty.
  Registration is optional: skip or dismiss the name dialog to return to the
  menu without saving. Blank names remain allowed. Other names may contain up
  to 16 user-perceived characters (grapheme clusters) and support safe Unicode,
  including Chinese, mixed case, emoji, and punctuation. Case is preserved;
  unsafe invisible/control formatting is stripped before plain-text display.
  Older padded Latin records remain compatible. Zen runs do not enter the
  Classic records.

During play, select tiles with left-click. Right-click cancels the active
selection. Use the on-screen buttons for hints, shuffles, pause/resume, and
restart. The complete board stays centered and scales to the available width
and height without scrolling. Game information and chance stars sit above it;
the action buttons remain below it.

## Choose your emoji style

Open **設定** to switch between **Fluent 3D**, **Fluent Animated**,
**Noto Color Emoji**, **Twemoji**, and **OpenMoji**. All five support the same
75 candidates, selected for full-body artwork in all four libraries, with
obvious pests and confusing variants excluded. Switching styles preserves
the level's 36 selected kinds, positions, selection, score, and progress.
Settings include a preview of all 75 candidates, a default mode, and a
Classic difficulty for the next new game. Changing these preferences during
play leaves the current run's mode and difficulty intact, including on restart.

Fluent Animated includes 73 animated animals; coral and oyster use Fluent 3D
static artwork because upstream has no animations for them. When the system
prefers reduced motion, all Fluent Animated tiles use static Fluent 3D artwork.
Previously saved Fluent Flat selections switch to Fluent Animated.

Settings and best records use this browser's `localStorage`. They persist
across reloads; an unfinished run does not. If storage is unavailable, the
game works in memory and shows a notice. In Classic mode, opening settings
or instructions during play does not stop the timer. Elapsed time also counts
in background tabs. Use the game's paid pause when taking a break.

## Scope and evidence

[`re/RULESET.md`](re/RULESET.md) describes the target rules;
[`re/AUDIT.md`](re/AUDIT.md) distinguishes direct static evidence from live
observations. Rule tests establish this implementation's behavior, rather
than claiming that every possible original-game state was compared live.

Web adaptations are deliberate: seeded uniform shuffles replace the original
VB random sequence, each level samples 36 kinds from a curated animal pool
([selection policy](docs/ANIMAL_SELECTION.md)), artwork comes from open emoji projects, score tables use
browser storage instead of a Windows `.hst` file, score registration can be
skipped, web names preserve case and strip unsafe invisible/control formatting,
and Zen provides an untimed alternative to the original Classic rules.
Original audio, original artwork, and exact animation timings are outside
scope. A service worker, saved-run restore, and custom asset-pack upload are
not implemented.

## Repository

```text
src/core/       Pure board, paths, rearrangements, and seeded RNG.
src/game/       Session state machine and high-score rules.
src/content/    Levels, animal identities, and emoji themes.
src/config/     Validated settings and resilient browser storage.
src/ui/         Vue + Vuetify app, board, artwork, and settings.
public/tiles/   375 locally bundled images and a provenance/hash manifest.
public/licenses/  Full artwork licences and notices.
tests/          Rule, storage, and asset-integrity tests.
re/             Evidence and clean-room investigation records.
docs/           Architecture, roadmap, and asset policy.
```

Agent policy is generated by
[`agent-workbench`](https://github.com/KiringYJ/agent-workbench).
`AI_AGENT_GUIDE.md` is managed; current project context belongs in
`AI_AGENT_PROJECT.md`.

## Licences

Source code is MIT-licensed. The bundled artwork has its own MIT,
Apache-2.0, CC BY 4.0, or CC BY-SA 4.0 licence; see
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and the in-game credits.
The original game and its assets belong to their original author. This is an
independent, unaffiliated reimplementation with no original binary, artwork,
music, fonts, or runtime DLLs included.

## 繁體中文

**openkawai** 是《KAWAI 連連看 2004》的瀏覽器重寫版，介面使用 Vue 與
Vuetify。每關從 75 種候選動物隨機選取 36 種，各四張，實作 16 × 9 棋盤、
11 關消牌變形、計分、有限提示／洗牌及機會翻牌。經典模式保留弱、強、
超強三種計時難度與最佳紀錄；禪意模式沒有時間限制。

如果想在 Windows 11 玩原始的 KAWAI 連連看，可參考
[`kawai-win11-compat`](https://github.com/KiringYJ/kawai-win11-compat)。
該專案提供 2003、2004、2005 版的相容性工具與本機設定說明，原始遊戲檔案需另行取得。

禪意模式保留 11 關、提示／洗牌次數、暫停費用與無解時的結束規則，沒有時間加分，
時間牌改為提示或洗牌獎勵，成績不列入經典模式最佳紀錄。主選單與設定可選擇
模式；模式和經典模式難度會保存，遊戲中的變更於下次新遊戲生效。

玩家名稱最多 16 個字，支援各種文字、數字、符號與表情符號，保留輸入的大小寫；
組合表情符號算一個字，也可留白。名稱以純文字顯示，會移除控制或方向干擾字元，
舊紀錄仍可讀取。

在「設定」可切換 Fluent 3D、Fluent Animated、Noto Color Emoji、Twemoji、
OpenMoji，預覽全部 75 種候選動物。候選須在四個圖庫都有全身像，排除害蟲
與過度相似的變體。更換風格不會改變當關動物或進度。五套共 375 張
圖檔隨專案附上；設定與排行榜保存在目前瀏覽器，未完成的遊戲不會保存。

Fluent Animated 有 73 種動態圖案；珊瑚與牡蠣因官方未提供動畫，使用
Fluent 3D 靜態圖。系統偏好減少動態效果時，全部使用靜態圖。原先儲存的
Fluent Flat 設定會自動轉為 Fluent Animated。

遊戲中使用滑鼠左鍵選取圖案，右鍵取消目前選取；提示、洗牌、暫停／繼續及
重新開始請使用畫面上的按鈕。棋盤置中，依視窗寬高等比例縮放，完整顯示棋盤與
外圈，不需捲動。時間、分數與機會圖案集中在上方，操作按鈕固定在下方。

```sh
npm ci
npm run dev
```

程式碼採 MIT 授權，圖案依各圖庫授權使用並附上來源及完整授權。本專案
不含原作執行檔、擷取素材、音樂或反編譯程式碼。
