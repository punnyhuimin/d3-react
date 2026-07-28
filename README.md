# d3-react

React 19 + TypeScript + D3.js, built with RSBuild.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` / `npm run lint:fix` — ESLint
- `npm run format` / `npm run format:check` — Prettier
- `npm run typecheck` — TypeScript, no emit
- `npm test` / `npm run test:watch` / `npm run test:coverage` — Jest + React Testing Library

## Structure

```
src/
  components/   reusable, presentational components (e.g. BarChart)
  hooks/        reusable hooks (e.g. useD3)
  features/     feature modules composing components + hooks
  pages/        top-level route/page components
```

## Path aliases

`@/*` maps to `src/*` (plus explicit `@/components`, `@/hooks`, `@/features`, `@/pages`),
configured in `tsconfig.json`, `rsbuild.config.ts`, and `jest.config.cjs`.
