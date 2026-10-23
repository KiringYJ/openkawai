# Design

## Source of truth

Status: Active. Updated: 2026-10-24.

This contract covers the menu, game toolbar, settings, rules, credits,
leaderboards, and pause, chance-card, result, record-entry, and restart dialogs.
Evidence: the owner's interface feedback and screenshots, `src/ui/App.vue`,
`src/ui/SettingsDialog.vue`, `src/ui/GameBoard.vue`, `src/styles.css`,
`src/main.ts`, `AI_AGENT_PROJECT.md`, and the installed Vuetify 4.3 styles.
No separate brand kit or approved design mockup exists.

## Brand

Quiet, readable, functional. Use `openkawai` once in the header, at 18px and
weight 600. The menu title is `連連看`. Original-game provenance belongs in
credits. Avoid ornamental fonts, slogans, arbitrary accent colors, and
decorative changes of type size within one paragraph.

## Product goals

Make it easy to start a game, recognize mode and difficulty, read resources,
and distinguish tile states. Equal-purpose text must share the same typography
and color across screens. The full board and its outer path ring must fit the
viewport. A redesign of game rules or a new visual brand is outside this scope.

## Personas and jobs

The primary assumed audience is Traditional Chinese readers playing with a
mouse on desktop, including small windows and browser zoom. They choose a mode,
match tiles, use resources, and inspect local records. Players consulting rules
or licenses need readable grouped content with clear source relationships.

## Information architecture

One page has a menu and a game workspace. The header provides home, records,
rules, credits during play, and settings. Menu footer links to GitHub and
credits. Dialogs keep their title, content, and actions in that order. Credits
group each library's author, license, and notices together. Record tabs identify
the active difficulty with both a filled state and a check icon.

## Design principles

- Assign a semantic role before styling text. Reuse the role everywhere.
- Use spacing and weight to organize content before introducing another size.
- Use green for actions and selection, amber for rewards/warnings, and red for
  errors or urgent time. Ordinary prose remains the normal text color.
- Preserve familiar Vuetify controls and states. Custom CSS owns shared type
  tokens and the board's specialized geometry and materials.
- Reflow compact layouts before reducing text. Do not add one-off font sizes
  in media queries or component templates.

## Visual language

### Typography

One system sans-serif stack: `Segoe UI`, `Microsoft JhengHei`, `sans-serif`.
Headings, Latin labels, Chinese text, controls, and dialogs use that stack.
OS glyph fallback is expected; no web font is downloaded. Font weights are
400 (regular), 600 (emphasis/controls), and 700 (major headings, selected tabs,
record scores, the pending record-entry row, and library names).
Sizes use rem units at a 16px browser default and remain zoomable.

| Role | Default size | Weight | Line height | Use |
| --- | --- | --- | --- | --- |
| Title | 24px | 700 | 1.4 | Menu title, every dialog title |
| Section | 16px | 600 | 1.5 | Group labels and credits subsections |
| Body | 14px | 400 | 1.8 | Rules, prose, lists, records, alerts |
| Control | 14px | 600 | 1.5 | Buttons and tabs, including footer |
| Caption | 12px | 400 | 1.5 | Field help, metadata, resource labels, chips |
| Brand | 18px | 600 | 1.5 | Header name only |
| Statistic | 24px | 700 | 1.2 | Game time and score; compact profile uses 18px |
| Result score | 32px | 700 | 1.2 | Final/round score only; unit remains Body |
| Field value/label | 16px | 400 | Vuetify field geometry | Select/text input; floating label is 12px |

The game level name uses Section. Caption, Body, and Control sizes do not shrink
on narrow screens. The only compact typography switch is Statistic to the
existing 18px size at width <=760px or height <=500px. Numeric resources and
scores use tabular figures. Artwork fallback glyphs and SVG/icon dimensions are
image geometry, not additional prose roles.

### Color

`src/main.ts` owns the Vuetify `garden` palette. Components refer to semantic
theme names; CSS refers to generated `--v-theme-*` variables.

| Token | Value | Purpose |
| --- | --- | --- |
| background | #F7F7F2 | Page |
| surface | #FFFFFF | Dialogs and cards |
| surface-variant | #E9EDE6 | Secondary surfaces |
| on-surface / on-background | #26382E | All ordinary prose and headings |
| muted / on-surface-variant | #5B6B60 | Metadata and secondary labels |
| primary / success | #2F6B4F | Actions, links, selection, success |
| on-primary and other on-accent tokens | #FFFFFF | Text on solid accent controls |
| secondary | #8A5B26 | Earned stars and rewards |
| warning | #90541A | Warnings, hints, connection paths |
| error | #B14D42 | Invalid matches and urgent remaining time |
| info | #3A6A8C | Informational alerts |
| border | #DCE2D9 | Dividers and outlined controls |
| board | #EAF0E5 | Board/preview ground |
| selection | #E4F0CB | Selected tile face |
| warning-container | #FFF1CD | Hint tile face |
| error-container | #FFE4DB | Invalid tile face |

Normal and muted text are explicit opaque colors; do not create extra shades
with text-emphasis opacity utilities. Disabled states and Vuetify state layers
may retain their library opacity behavior. A paragraph does not change color
just because it follows another paragraph. Muted is reserved for metadata/help.
Links have no persistent underline; hover and visible keyboard focus reveal it.

Ivory tile faces/extrusions use the material tokens at the top of
`src/styles.css`. Those colors describe image surfaces, not UI text. Licensed
artwork keeps its original colors. All five artwork packs share the same UI
palette and type system.

### Spacing, shape, and elevation

Use Vuetify's 4px spacing steps. Dialog content has 24px horizontal inset,
section gaps 16px, and related controls 8px. Mode controls have equal width with
an 8px gap. Cards use Vuetify `xl` rounding and no elevation; buttons use `lg`.
Keep the existing flat ivory tile faces and exposed diagonal side planes.

### Motion and imagery

Use local licensed tile images and the installed MDI SVG icons. Motion conveys
feedback only. Honor reduced motion for CSS effects and animated artwork.

## Components

Vuetify owns buttons, toggles, tabs, selects, text fields, cards, alerts,
progress, tables, and dialogs. `src/main.ts` supplies shared component defaults
and palette. `src/styles.css` supplies the small shared type-role scale,
component typography integration, layout, and tile materials. Do not create a
second component framework or duplicate tokens in individual Vue files.

`App.vue` owns sessions and dialog orchestration; `SettingsDialog.vue` owns
settings presentation; `GameBoard.vue` owns pointer selection/cancellation and
board rendering. Preserve their existing props/events and the pure game core.
Use semantic headings, paragraphs, lists, and table headers within components.

## Accessibility

Target readable WCAG AA text contrast, including muted text on page/card
surfaces. Validate actual rendered foreground/background pairs. Selected tabs
also have a check icon; tile states use outlines, markers, or motion as well as
color. Retain meaningful accessible names, visible focus, dialog focus
management, and normal browser/form keyboard operation. The owner explicitly
chose mouse-only board play: left-click selects, right-click cancels; game
keyboard shortcuts and tile focus navigation are absent. Do not silently
reintroduce them. Honor reduced motion.

## Responsive behavior

The shell is centered at a maximum of 1200px. Width <=760px reflows the toolbar,
settings preview, and chance cards. Height <=500px and <=300px reduce spacing
and control heights, keeping the type roles intact except the documented
Statistic switch. Below 540px width and at <=300px height, the level name may
truncate to keep a single toolbar row; its full accessible name and hover title
remain available, and the mode/level chip stays visible. Dialog content scrolls
internally when needed; actions stay
reachable. Verify desktop, 375px width, short landscape, and zoom-equivalent
viewports. Width is a layout signal, not an input-capability signal.

## Interaction states

Keep Vuetify hover, focus, pressed, selected, disabled, and alert treatments.
Leaderboards show centered em dashes for empty cells at the same Body size/weight;
only actual scores receive emphasis. The pending record-entry row uses primary
color, bold weight, and an accessible current-row marker to identify the unsaved
result. Paused games cover the board. Hint and
invalid-match tiles use their named colors and markers. A failed image shows
its existing fallback; assets remain local. Storage failure has an explicit
warning. Settings changes preserve the running board and saved preferences.

## Content voice

Use concise Traditional Chinese interface copy: `經典模式`, `禪意模式`,
`提示`, `洗牌`, `最佳紀錄`. Keep proper names such as GitHub and asset-pack names
in their original spelling. Avoid promotional copy and unnecessary repeated
brand names. Documentation and code remain English.

Player names are a deliberate web adaptation: preserve case and allow Unicode
letters, numbers, punctuation, and emoji, up to 16 grapheme clusters. Blank
names remain allowed. Do not rewrite the input model during IME composition.
Use the shared name parser for validation, counters, previews, and persistence;
reject over-limit names instead of truncating a character. Normalize at the
domain boundary, strip unsafe invisible/control formatting, and retain valid
joining/emoji sequences. Display names through Vue text interpolation inside
`bdi`, allow wrapping, and keep table headers on one line. Legacy padded Latin
records remain readable under the existing storage key.

## Implementation constraints

Vue 3, TypeScript, and Vuetify 4 are established; add no dependencies for this
work. Avoid obsolete Vuetify typography helpers, inline font sizes, arbitrary
weight values, and literal UI colors outside their owning token definitions.
New UI must select an existing role; adding a role requires updating this
contract and its shared implementation together. Keep game behavior unchanged.
Use `npm test`, `npm run build`, browser computed-style checks, and screenshots
of representative menu/dialog/game surfaces. Follow the broader responsive and
gameplay checks in `AI_AGENT_PROJECT.md`.

## Open questions

No blocking questions for this scope. A future downloadable font or alternate
UI color theme needs an explicit product decision; neither is currently planned.
