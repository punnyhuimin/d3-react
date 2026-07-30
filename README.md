# d3-react

React 19 + TypeScript + D3.js, built with RSBuild.

A single view — **percent value vs category** — built from `src/data/users.json`. Every number on
screen is derived at runtime: `src/lib/aggregate.ts` groups the records with `d3.rollups` and shares
out the grand total with `d3.sum`, and `src/lib/missingData.ts` detects the categories the dataset
skips so they can be drawn as genuinely missing rather than bridged over. Nothing is precomputed or
transcribed into source.

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

## AI Usage (Words from the human)

I used Claude to plan out and iterate the design and implementation. Used `agent-browser` as well for Claude to access the browser to resolve UI issues.

Below describes the thought process while working with Claude

### 1. Setting up a React app

Documentation accessed: [react.dev](https://react.dev/learn/creating-a-react-app)

Based on the task, it was clear that this was a simple SPA. It does not require SSR (next.js) or routing. The best options for a simple SPA were:

1. Vite
2. Parcel
3. RSBuild

I ultimately chose RSBuild as I've had experience with it, and bundling speeds were very fast compared to my previous usage of Vite. I had not explored Parcel before, and given the time constraints, I decided to go with RSBuild.

Core functionalities for all my coding projects:

1. Linters (eslint and prettier)
2. Testing libraries (Jest and React Testing Library)

Folder structure:

- I used a generic folder structure that would work for most codebases.

The prompt I used to get Claude to churn out a base application:

```txt
Create a new React 19 + TypeScript + D3.js project
using RSBuild. Set up ESLint, Prettier, jest, and React
Testing Library. Include a folder structure with
components/, hooks/, features/, and pages/ directories.
Add path aliases so @/components works.
```

This churned out a template React application that had all the requested features and functions. There was an ambiguity on how d3.js would be used by the system, as it was not listed in the prompt. Claude created a `BarChart` with a `useD3` hook as a placeholder to fill that requirement. You will notice this being mentioned in the plan markdown later on.

Some issues with the churned code:

- it used generic parameters for the tsconfig, and did not assess if it was suitable for the current library versions that were setup
- outdated configurations that were no longer compatible with the latest version of RSBuild and TS. (e.g. source.alias vs resolve.alias errors flagged up on `npm run dev`, deprecated alias path in tsconfig)

### 2. Planning out the features

I used Plan mode with Claude to ideate on how to go about implementing the features, and also understand how to build with D3.js. With AI agents, they are typically ambitious and would churn massive LoCs in one big bang. This makes it difficult to track and vet the changes. Research beforehand is always critical to get the most efficient implementation.

It was crucial to breakdown the tasks into small steps. Additionally, I requested it to use the `/grill-me` [skill by Matt Pocock](https://www.aihero.dev/skills-grill-me) in order to clarify any assumptions before making them. Seems like it has been "deprecated" though.

I gave it the PDF in order for it to understand the requirements that were listed, and the intended UI.

It was able to give me a warning, where there were two missing numbers in a series data. A question was raised on how to workaround this issue - whether it should interpolate the data, or skip it totally. I happened to be browsing the available D3 demos, and came across a line chart that handled this exact scenario. See the demo here: [line-chart-missing-data](https://observablehq.com/@d3/line-chart-missing-data/2)

Iteration is critical when using AI. The first draft of the plan contained finalised calculations (summation of values, percentages, grouping of users by categories) and placed them in the planning markdown. This meant that the values it was planning to work with were pre-computed, and were to be hardcoded in the system. Considering that applications typically do not work with hardcoded data, I requested that all summation and data should be done at runtime, to account for any changes in the data in the future.

Churned plan is at [percent-val-category.md](.claude/plans/percent-val-category.md)

### 3. Execution

Once the plan was finalised, it was small changes per phase initiated. This helped to ease review, as I could understand what feature the changes were related to, and check if they were working as intended.

I used `agent-browser` to allow Claude to rectify UI issues, such as illegibility of certain tooltips due to faulty `max-width` settings.

### 4. Review

I made use of [/thermo-nuclear-code-quality-review](https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review/SKILL.md) to review the code. This is a skill that I typically use in my day-to-day, and I find to be helpful to find regressions from code changes, or ambiguity in implementations.

## Improvements

- Assuming that there are no further pages to be made, the page folder can be removed, as there is only a single page.
