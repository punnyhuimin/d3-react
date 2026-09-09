# `latest.current` in `useBrushX`: render-body write vs `useEffect`

About the commented-out block in [`src/hooks/useBrushX.ts`](../src/hooks/useBrushX.ts):

```ts
// useEffect(() => {
latest.current = { scale, onSelect };
// }); // actually... im damn confused.
// wouldnt this just fire every time this component re-renders.
```

**Short answer: in this app the two forms are observationally identical.** The phase
distinction below is real in React's model, but nothing here ever occupies the windows
where it shows up. The resize behaviour that prompted the question comes from d3, not from
the ref write — see [§4](#4-the-grey-rect-is-governed-by-neither-form).

> **Confidence:**
>
> - §1–§3 are React semantics, and the "no observable difference" conclusion is
>   **measured** — logging `current.range()[1]` and `event.selection` inside the `brush`
>   handler produces identical output either way.
> - §4 is read from `node_modules/d3-brush/src/brush.js`. It has **not** been observed in a
>   browser, and no test covers it.

---

## 1. The question in the comment

> wouldn't this just fire every time this component re-renders

Yes. Both forms fire on every render. That is *not* the difference. The difference is
**which phase** they run in and **which renders count**.

| | render-body assignment | `useEffect(() => …)` with no deps |
| --- | --- | --- |
| Phase | render, before the DOM is updated | commit, after paint |
| Uncommitted renders (StrictMode double-render, interrupted concurrent renders) | **writes anyway** | never writes |
| Timing | synchronous | passive effect → **scheduled, async** |

`<StrictMode>` is on in [`src/main.tsx`](../src/main.tsx), so render functions are
double-invoked in dev.

Within a single quiet commit they are equivalent regardless. The ref-update effect is
declared *before* the brush effect, and React runs a component's effects in declaration
order, so `latest.current` is fresh before `group.call(brush)` runs either way.

## 2. The two windows where they *could* diverge

**a. Committed, but passive effects not yet flushed.**
The `<svg>` already has its new width and the brush effect has not re-run yet. The
`useEffect` version still holds the *previous* scale — it **lags the DOM**.

**b. A render React abandons or replays.**
The render-body version has already written a scale from a tree that was never committed —
it **leads the DOM**. The `useEffect` version never does this.

They are wrong in opposite directions, in different windows.

## 3. Why neither window is reachable here

`latest.current.scale` is read in one place that matters — `current.invert(from)` inside the
`brush` handler. So the two forms can only produce different numbers if a **`brush` event
fires while they hold scales with different `range()`s**. Three things close that off:

1. **The range only changes on resize.** During a drag, `scale` is a fresh
   `d3.scaleLinear()` on every render, but its range is unchanged — so `current.range()[1]`
   is the same number either way. New object, same numbers.

2. **During a resize, the only thing that emits a `brush` event is the `brush.move`
   re-project inside the `[width, height]` effect** (§5b). That is a passive effect, so by
   the time it runs, *both* the render-phase write and the layout-effect write have already
   completed for that commit. They read the same `latest.current` **by construction**.

3. **Window 2a needs a user gesture to land inside it** — resizing the window and dragging
   the brush within the same frame. Not something a person does.

Window 2b needs React to actually abandon a render. `setWidth` from `ResizeObserver`
([`src/hooks/useResizeObserver.ts`](../src/hooks/useResizeObserver.ts)) is a plain
default-priority update, and nothing here uses `startTransition` or `useDeferredValue`, so
renders run to completion. StrictMode does run the render-phase write twice — with identical
values both times.

**Hence the measurement: identical output.** The windows are real; this app is never in one.

---

## 4. The grey rect is governed by neither form

This is what the resize screenshots were actually showing.

From `node_modules/d3-brush/src/brush.js:588`:

```js
function initialize() {
  var state = this.__brush || {selection: null};
  state.extent = number2(extent.apply(this, arguments));
  state.dim = dim;
  return state;
}
```

`brush(group)` calls `group.property("__brush", initialize)`. `__brush` lives on the DOM
node, and the cleanup in `useBrushX` only does `group.selectAll('*').remove()` — that
removes the **children**, not `node.__brush`.

So on every re-attach, d3:

- **keeps** the existing `selection`, in **raw pixels**
- **replaces** only `extent`
- repaints the rect at those raw pixels (`redraw`, brush.js:256)

The selection is never rescaled to the new range and never clamped to the new extent.

Consequences:

- **Shrink** → the rect keeps its old, too-wide pixels, overflows the new extent, and is
  clipped by the `<svg>` → looks like "the filter runs to the end of the brush area".
- **Restore the width** → identical pixels again, so geometrically it should land back
  exactly where it started.
- Throughout, React's `selection` state (in **domain** units) never updates, because a
  re-attach on its own emits no brush event.

Note also that the two original screenshots were 1863px and 1739px wide, so they may not
have been taken at the same window width.

---

## 5. What the code ended up doing

### 5a. `useLayoutEffect` for the latest-ref

```ts
useLayoutEffect(() => {
  latest.current = { scale, selection, onSelect };
});
```

**This is a robustness default, not a fix for anything observed.** It costs nothing, avoids
mutating a ref during render (which React documents as unsafe), and stays correct if this
app ever adopts `startTransition` or `useDeferredValue` — the thing that would make window
2b reachable.

It is also neither ahead of nor behind the DOM: layout effects flush before passive effects
(`flushLayoutEffects()` then `flushPassiveEffects()` inside `flushPendingEffects`,
`node_modules/react-dom/cjs/react-dom-client.development.js:18354`), so the ref is fresh
before the brush effect rebuilds.

### 5b. Re-project the selection on resize

This is the change that addresses §4. The caller's domain selection is the source of truth
and gets re-applied through the new scale after re-attaching. `useBrushX` takes a
`selection` option:

```ts
export interface UseBrushXOptions {
  // …
  /**
   * The current selection in **domain** units — the caller's state, not the brush's.
   * The source of truth the brush is re-projected from when the extent changes.
   */
  selection: [number, number] | null;
}
```

which rides along in the same ref, and is applied at the end of the `[width, height]` effect:

```ts
const { scale: current, selection: domain } = latest.current;
if (domain !== null) {
  group.call(brush.move, [current(domain[0]), current(domain[1])]);
}
```

`brush.move` clamps to the new extent and re-emits, so the rect, the extent and React state
end up agreeing. `BrushSummary` already held the selection — it just passes it down now.

Two things this depends on:

- The re-emit runs through the same `brush` handler, so React state is refreshed from the
  clamped pixels. It cannot loop: the effect's deps are `[width, height]` only.
- `brush.move` is called without an `event` argument, so `event.sourceEvent` is `undefined`
  in the `end` handler and the `!event.selection && event.sourceEvent` guard does not
  mistake a re-project for a user clear.

### 5c. Do not put `scale` in the dep array

Tempting, but wrong. `scale` is a fresh `d3.scaleLinear()` on every render, so
`[width, height, scale]` rebuilds the brush on every render and tears it down mid-drag —
which is the exact failure the latest-ref exists to avoid. Only a genuine change of extent
should re-attach the brush.

---

## How this was measured

Swap between the two forms and resize the window:

```ts
latest.current = { scale, onSelect };
console.log('WRITE', scale.range()[1], performance.now());

// vs

useEffect(() => {
  latest.current = { scale, onSelect };
  console.log('WRITE', scale.range()[1], performance.now());
});
```

Then log `current.range()[1]` and `event.selection` inside the `brush` handler.

**Result: identical output from both forms.** No `brush` event ever fires while the two
disagree, for the reasons in §3.

If you later add `startTransition` or `useDeferredValue` anywhere above `BrushSummary`, this
is the experiment to re-run — window 2b becomes reachable at that point.
