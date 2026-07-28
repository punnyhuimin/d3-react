# Percent Value vs Category — interactive D3 line chart

## Context

This repo is untouched scaffolding: React 19 + TypeScript + D3 v7 on RSBuild, with a single
throwaway `BarChart` demo and one hook. The task is to build a line chart of
**Percent Value vs Category** with a sticky crosshair pinpoint, plus a summary chart with brush-to-filter.

Decisions confirmed with the user:

1. **X axis is linear** (numeric categories), and absent categories are rendered _as missing_ using
   D3's [line-chart-missing-data](https://observablehq.com/@d3/line-chart-missing-data/2) technique —
   a faint dashed bridge under a main line broken by `.defined()`.
2. **Y rescales on brush.** Default domain is 0–100% per the brief; brushing zooms Y to the
   selection's extent, the only reading under which "filtered on y and x axis" means anything.
3. **Designed & themed** — design tokens, validated accessible palette, light + dark mode.
4. **Data lives in a JSON file**, statically imported (`resolveJsonModule` is already enabled).
5. **All summation and grouping goes through D3** — `d3.rollups`, `d3.sum`, `d3.ascending`,
   `d3.extent`, `d3.range`, `d3.least`. No hand-rolled `reduce`.
6. **No invented data.** Every number on screen is derived from `users.json` at runtime. Nothing
   precomputed, no percentages transcribed into source. The missing categories are _detected_, not
   authored.
7. **Phased commits.** Each phase below is one commit that leaves the app building, linting, typechecking
   and passing tests. No big-bang commit.

Work happens on a branch off `main` (currently one commit, `ce4a875`, clean tree):
`feat/percent-value-by-category`.

## Architectural stance

**D3 does the maths; React owns the DOM.** Scales, `d3.line()`, rollups and the nearest-point search
are pure functions whose output React renders as ordinary JSX (`<path d={…}>`, `<line>`, `<circle>`).
Axes are rendered declaratively from `scale.ticks()` rather than via `d3.axisBottom` — this keeps full
control of recessive grid/tick styling and stops D3 and React fighting over the same nodes.

The one genuine exception is **`d3.brushX`**, which is inherently imperative and stateful. It is
isolated behind a single hook, the only place D3 mutates the DOM.

This is why the existing `useD3` hook goes away: it does `selectAll('*').remove()` and redraws the
whole SVG on every dependency change — fine for a static bar chart, wrong for a chart that
re-renders on `pointermove`.

## Constraints to respect

- **Keep `import * as d3 from 'd3'`.** `jest.config.cjs` maps `^d3$` to `d3.min.js` to work around d3
  v7 being ESM-only under Jest. Importing `d3-scale`/`d3-shape` subpackages instead would silently
  break the test run until new mappings are added.
- **`noUncheckedIndexedAccess: true`** — every array index yields `T | undefined`. The nearest-point
  scan and the brush-selection inversion must handle that explicitly, not with `!`.
- **Jest fails a run with zero test files**, which is why the scaffold's only test is not deleted
  until Phase 4, after replacement tests exist.
- **Path aliases live in three files** (`tsconfig.json`, `rsbuild.config.ts`, `jest.config.cjs`). New
  dirs `@/data`, `@/lib`, `@/styles` resolve through the existing catch-all `^@/(.*)$`, so no config
  change is needed — but the specific-prefix rules must stay ordered before it.
- **House style**: named exports only, `function` declarations for components, exported `interface`
  for props, single quotes, semicolons, trailing commas, 100 col, 2-space indent.
- `npm run lint` runs `--max-warnings 0`, so unused vars and `jsx-a11y` findings fail the build.

**Every phase gate is the same four commands**, all of which must pass before the commit:
`npm run typecheck && npm run lint && npm test && npm run build`.

---

## Phase 0 — Commit the plan

`docs: add implementation plan for percent value vs category chart`

Create the branch `feat/percent-value-by-category` off `main`, then save this document verbatim to
**`docs/PLAN.md`** in the repo so the plan is version-controlled alongside the work it describes and
each subsequent commit can be read against it. Add a short pointer to it from `README.md`.

No code, no gate beyond `npm run build` still succeeding (nothing has changed yet).

## Phase 1 — Dataset and design tokens

`feat: add users dataset and design tokens`

| File                     | Purpose                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/users.json`    | The 15 records transcribed verbatim from the PDF. The single source of truth.                                                                                                                                                                                                                                                                               |
| `src/data/users.ts`      | `UserRecord` interface, typed import of the JSON, and a narrow runtime shape check so a malformed edit fails loudly rather than rendering `NaN`.                                                                                                                                                                                                            |
| `src/styles/tokens.css`  | Design tokens as CSS custom properties from the validated reference palette: series `#2a78d6`/`#3987e5`, gridline `#e1e0d9`/`#2c2c2a`, baseline `#c3c2b7`/`#383835`, muted ink `#898781`, surfaces `#fcfcfb`/`#1a1a19`, page `#f9f9f7`/`#0d0d0d`. Dark values declared under **both** `@media (prefers-color-scheme: dark)` and `:root[data-theme="dark"]`. |
| `src/main.tsx`           | One line added: `import '@/styles/tokens.css';`                                                                                                                                                                                                                                                                                                             |
| `src/data/users.test.ts` | Asserts the JSON parses to a non-empty array and every record has a string `user` and finite numeric `value`/`category`.                                                                                                                                                                                                                                    |

Nothing visual changes; the bar chart still renders. This commit exists so the data and the theme
land before anything depends on them.

## Phase 2 — Aggregation with D3

`feat: aggregate percent by category using d3.rollups`

`src/lib/aggregate.ts` — the Axes Definition, as pure functions:

- `CategoryPoint` — `{ category, users: string[], label: string, total: number, percent: number }`
- `aggregateByCategory(records)` — `d3.rollups` to group by category, `d3.sum` for both the per-group
  total and the grand total, `d3.ascending` to sort the categories. Merges user names into `label`
  with `', '`. Computes `percent = total / grandTotal * 100`.
- `formatPercent` — one shared `d3.format` wrapper, so axis ticks (`0%`) and readouts (`22.6%`) can't drift.

`src/lib/aggregate.test.ts` asserts **invariants derived from the JSON**, not a transcribed table:
categories come back strictly ascending; every input user appears in exactly one group; each group's
`total` equals `d3.sum` of its own records; the percentages sum to 100; a category with multiple users
has them comma-joined.

No UI change.

## Phase 3 — Missing-data handling

`feat: detect and describe missing categories for display`

`src/lib/missingData.ts` — the dedicated missing-data module. It never invents source data; it
derives _display instructions_ from what the real data does and doesn't contain:

- `findMissingCategories(points)` — walks `d3.range` across the `d3.extent` of the observed categories
  and returns the integers that carry no records.
- `buildDisplaySeries(points)` — the render-time series: every integer in the observed range, with
  `percent: null` where a category is missing. This is what `d3.line().defined()` consumes.
- `buildGapSegments(points)` — returns each gap as a `{ from, to }` pair of the real points that
  bracket it, so the dashed bridge is drawn and labelled **per gap** rather than assuming there is
  exactly one. This is a refinement of the Observable technique: same visual, no overdraw beneath the
  solid line, and each gap can carry its own label.

`src/lib/missingData.test.ts` — detects the gap(s) present in the real `users.json`; a synthetic
fixture with two separate gaps yields two segments; a contiguous fixture yields none; a single-point
fixture doesn't crash.

No UI change.

## Phase 4 — Remove the scaffold, add the page shell and table

`refactor: replace bar chart scaffold with percent-by-category shell`

Deleted: `src/components/BarChart.tsx`, `src/components/BarChart.test.tsx`,
`src/features/dashboard/` (whole dir), `src/hooks/useD3.ts`.

| File                                                          | Purpose                                                                                                                                                                                                                     |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/percent-by-category/PercentByCategoryChart.tsx` | The composition root. Memoises `aggregateByCategory(records)` and will later own filter state. For now it renders the caption and the table.                                                                                |
| `src/features/percent-by-category/DataTable.tsx`              | The accessible table view — category, merged user names, total, percent. Not decoration: it satisfies "tooltips enhance, never gate", and it's where the comma-joined names are permanently visible rather than hover-only. |
| `src/pages/App.tsx` (rewritten)                               | Page shell: title, and a caption stating the total and category count — both computed, not typed in.                                                                                                                        |
| `src/pages/app.module.css`                                    | Page layout, card surface, typography.                                                                                                                                                                                      |
| `src/features/percent-by-category/DataTable.test.tsx`         | Renders one row per category with the merged names.                                                                                                                                                                         |

By this commit the aggregation is visible and verifiable in the browser before any chart exists.

## Phase 5 — The line chart

`feat: render percent value vs category line chart`

| File                                      | Purpose                                                                                                                                                                                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/hooks/useResizeObserver.ts`          | Returns a ref and the observed container width so both charts fill their column responsively instead of being hardcoded to a pixel width.                                                                                                                                                      |
| `src/components/chart/Axis.tsx`           | One declarative axis used for both X and Y. Takes a scale, orientation, explicit `tickValues`, a formatter and a `showGrid` flag; renders baseline, ticks, labels and (for Y) hairline gridlines. X ticks are every integer in range, so a missing category is visibly **labelled but empty**. |
| `src/components/chart/LineChart.tsx`      | X/Y scales; the main path from `buildDisplaySeries` with `.defined()`; a dashed bridge path per entry from `buildGapSegments` plus a direct label; visible dots so positions read without hovering. Y fixed at 0–100% with 10% ticks.                                                          |
| `src/components/chart/chart.module.css`   | Stroke widths, gap-line dashes, focus rings.                                                                                                                                                                                                                                                   |
| `src/components/chart/LineChart.test.tsx` | One dot per real category; the main path's `d` contains a second `M`, proving the line genuinely breaks at the gap.                                                                                                                                                                            |

**The core chart is now on screen**, minus interaction.

## Phase 6 — Sticky crosshair pinpoint

`feat: add sticky crosshair pinpoint with tooltip`

| File                                 | Purpose                                                                                                                                                                                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/nearestPoint.ts`            | The snapping logic, kept out of the component so it is testable in isolation. Uses `d3.least` over the real points, minimising distance to the inverted pointer position. Returns `CategoryPoint \| null`.                                                                                                  |
| `src/components/chart/Crosshair.tsx` | Purely presentational: full-height vertical line, full-width horizontal line, and the emphasised circle at their intersection with a 2px surface ring so it reads against the line. Holds no state and does no hit-testing.                                                                                 |
| `src/components/chart/Tooltip.tsx`   | Absolutely-positioned HTML card (not `foreignObject` — better text rendering). Percent leads as the strong element, then category, merged user names, raw total. Flips near the right edge so it never clips. Names inserted as React children, never `dangerouslySetInnerHTML`.                            |
| `LineChart.tsx` (extended)           | A transparent overlay `<rect>` over the plot area handling `pointermove`/`pointerleave`, inverting pointer x and calling `nearestPoint`. Keyboard parity: the SVG is focusable, arrows step between points, `Escape` clears — required both for accessibility and because `jsx-a11y` runs at zero warnings. |
| `src/lib/nearestPoint.test.ts`       | Exact midpoint behaviour; a position **inside a gap** must snap to one bracketing point and never float; out-of-range clamps to the end points.                                                                                                                                                             |
| `LineChart.test.tsx` (extended)      | `pointermove` snaps the crosshair to the nearest category; arrow keys step the pinpoint.                                                                                                                                                                                                                    |

**Main task complete.**

## Phase 7 — Summary chart and brush filter

`feat: add brushable summary chart that filters the main chart`

| File                                    | Purpose                                                                                                                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/hooks/useBrushX.ts`                | The only place D3 touches the DOM. Attaches `d3.brushX` to a ref'd `<g>`, wires `brush` and `end`, inverts the pixel selection through the passed scale, invokes `onSelect`, and reports `null` when cleared. Handles teardown and re-attachment when the extent changes. |
| `src/lib/domains.ts`                    | `yDomainFor(visiblePoints, isFiltered)` — `[0, 100]` unfiltered; otherwise a padded, `.nice()`d `d3.extent` of the visible percents, guarded for the 0- and 1-point selection cases.                                                                                      |
| `src/components/chart/BrushSummary.tsx` | A short (~64px) axis-less line drawn from the **full** series regardless of the current filter, so the selection keeps its context. Same two-path treatment at reduced weight. Includes a Reset affordance.                                                               |
| `PercentByCategoryChart.tsx` (extended) | Lifts `selection: [number, number] \| null` here — the single owner. Derives the visible slice and both domains from it. This is what lets the summary filter the main chart.                                                                                             |
| `chart.module.css` (extended)           | The grey selection band and handles, overriding D3's default `.selection` styling to match the mock.                                                                                                                                                                      |
| `src/lib/domains.test.ts`               | Unfiltered returns `[0, 100]`; a filtered slice tightens; empty and single-point selections don't produce a degenerate domain.                                                                                                                                            |

**Extra task complete.**

## Phase 8 — Polish

`feat: dark mode, accessibility and responsive polish`

Dark-mode pass across both charts and the tooltip; run the dataviz palette validator against the
chosen surfaces (single series, so this is a contrast check rather than a CVD separation check);
focus-visible rings; `prefers-reduced-motion`; responsive behaviour at narrow widths; update the
folder-convention section of `README.md` to mention `data/`, `lib/` and `styles/`.

---

## Final verification

Beyond the per-phase gate, run `npm run dev` and check by hand:

- The line breaks where categories are missing, with a faint dashed bridge and a visible label; the
  X axis still labels the empty categories.
- Moving the mouse anywhere in the plot snaps the crosshair to the single nearest point — **including
  inside the gap**, where it must stick to a bracketing point and never float.
- The tooltip shows comma-joined user names for a merged category.
- Y reads 0%–100% at 10% ticks when unbrushed.
- Dragging on the summary greys the selection, filters the main chart's X range **and** rescales Y;
  clearing restores 0–100% and the full range.
- The table's percentages sum to 100 and agree with the tooltip.
- Tab to the chart, arrow keys move the pinpoint, `Escape` clears.
- Toggle OS dark mode and confirm both themes.

Every figure above is read off the running app — none of it is asserted from a table written by hand.
