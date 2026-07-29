# d3-react

React 19 + TypeScript + D3.js, built with RSBuild.

A single view — **percent value vs category** — built from `src/data/users.json`. Every number on
screen is derived at runtime: `src/lib/aggregate.ts` groups the records with `d3.rollups` and shares
out the grand total with `d3.sum`, and `src/lib/missingData.ts` detects the categories the dataset
skips so they can be drawn as genuinely missing rather than bridged over. Nothing is precomputed or
transcribed into source.

The rule the code follows is **D3 does the maths; React owns the DOM**. Scales, shape generators and
rollups stay pure functions whose output renders as ordinary JSX, and axes are drawn from
`scale.ticks()` rather than `d3.axisBottom`, so D3 and React never fight over the same nodes.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` / `npm run lint:fix` — ESLint
- `npm run format` / `npm run format:check` — Prettier
- `npm run typecheck` — TypeScript, no emit
- `npm test` / `npm run test:watch` / `npm run test:coverage` — Jest + React Testing Library

## Structure

```text
src/
  data/         the source dataset and its runtime shape check
  lib/          pure derivation — aggregation, missing-category detection
  components/   reusable, presentational components
  hooks/        reusable hooks
  features/     feature modules composing components + hooks
  pages/        top-level route/page components
  styles/       design tokens as CSS custom properties
```

`lib/` holds no React and touches no DOM: it takes records in and returns plotted values out, which
is why it is the most heavily tested part of the repo. Component-scoped styling is a co-located
`*.module.css`; every colour in it resolves to a token from `styles/tokens.css`, so light and dark
mode swap in one place.

## Path aliases

`@/*` maps to `src/*` (plus explicit `@/components`, `@/hooks`, `@/features`, `@/pages`),
configured in `tsconfig.json`, `rsbuild.config.ts`, and `jest.config.cjs`. New directories resolve
through the catch-all, so adding one needs no config change — but the specific prefixes must stay
ordered before it.

Two ordering rules in `jest.config.cjs` are load-bearing: `moduleNameMapper` is first-match-wins, so
the stylesheet stub sits above the aliases (otherwise an aliased `*.module.css` resolves to the real
file and Jest parses CSS as JS), and `^d3$` maps to `d3.min.js` because d3 v7 is ESM-only under Jest
— which is why the app imports `* as d3` rather than the subpackages.

## AI Usage

Used Claude to plan out and iterate the design and implementation. Used agent-browser for Claude to access the browser to resolve UI issues.
