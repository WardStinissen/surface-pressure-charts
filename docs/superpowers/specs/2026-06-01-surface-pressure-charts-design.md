# Surface Pressure Charts Viewer — Design

**Date:** 2026-06-01
**Status:** Approved design, ready for implementation planning

## Goal

A mobile-friendly app to view the UK Met Office surface pressure charts, optimised for iPhone. The user wants to:

1. Navigate between the charts (forecast steps) in the latest model run.
2. Easily zoom in on a chart to inspect a location in detail.
3. While zoomed in, navigate to the next/previous chart **keeping the same zoom level and centre**, so the same area stays framed and its evolution can be compared across forecast times.

## The data source

Charts are public GIFs from the Met Office consumer-digital API. No authentication or API key is required, and `<img>` tags load them cross-origin without issue.

```
https://data.consumer-digital.api.metoffice.gov.uk/v1/surface-pressure/colour/<TIMESTAMP>/<CODE>_<FF>.gif
```

### Runs (two per day)

The chart code encodes the base hour of the run:

| Run | Published (approx.) | URL timestamp | Code | Forecast hours (`FF`) | Charts |
|-----|---------------------|---------------|------|-----------------------|--------|
| Morning | ~0730 UTC | `<date>T0000` | `FSXX00T` | `0,12,24,36,48,60,72,84` | 8 |
| Evening | ~1930 UTC | `<date>T1200` | `FSXX12T` | `0,12,24,36,48,60,72,96,120` | 9 |

Rule: 12-hourly steps for days 1–3, then **only the noon (12:00-valid) chart** for days 4–5 (forecast uncertainty makes more frequent updates low-value that far out). This is why `84`/`108` are absent from the 12Z run and `96`/`108`/`120` from the 00Z run.

- `FF = 0` is the analysis (observed state); the rest are forecasts.
- Each chart's **valid time** = run timestamp (UTC) + `FF` hours.
- All charts are **800×540 px** and share the same map frame, so a given location sits at the same pixel in every chart — this is what makes "keep zoom & centre across charts" pixel-accurate.

### Operational facts

- Runs are retained for **~6 days**; older ones return 404.
- The API sends **no CORS headers**, so a browser cannot `fetch()` the JSON catalogue cross-origin. We do not need it: the run schedule and hour-sets are known, and availability is detected via `<img>` load/error events (which need no CORS).

## Scope

- **In scope:** the single most recent available run, navigation across its forecast steps, zoom/pan, zoom-persistence across charts, deploy to GitHub Pages, PWA install on iPhone.
- **Out of scope (deferred):** browsing older runs, switching between the 00Z/12Z runs, run-to-run comparison, other Met Office products. The architecture leaves room to add these later (e.g. a serverless proxy for the JSON catalogue) without a rewrite.

## Build approach

Plain **HTML/CSS/JS, no build step**, deployed as static files to GitHub Pages. One small vendored pan/zoom library (a single JS file, e.g. `@panzoom/panzoom`) handles iOS pinch / pan / double-tap reliably. No framework and no bundler — deploy is simply committing the files.

Rationale: hand-rolling robust pinch-zoom on iOS Safari (focal point, bounds, momentum) is bug-prone and not worth it; a framework + bundler is overkill for a single screen.

## Architecture

Three concerns, each isolated. The first two are pure functions (no DOM, no network) and are unit-tested; the third is the UI layer that wires them together.

### `runResolver`
Given the current UTC time and an "is this image available?" probe, returns the latest available run `{ date, baseHour, code }`.

- Candidate order, newest first: today 12Z → today 00Z → yesterday 12Z → yesterday 00Z → …
- Pick the first candidate whose `_00.gif` loads (probe via `Image()` `onload`/`onerror`). This tolerates the approximate publish times — if the newest expected run is not up yet, it falls back to the previous one, so a broken "latest" is never shown.
- Cap the fallback at a few candidates; if none resolve, surface a clear error.

### `chartModel`
Given a resolved run, produces the ordered chart list. For each chart:
- `url` — built from timestamp, code, and `FF`.
- `leadHours` — the `FF` value.
- `validTime` — run time + `FF` hours (UTC).
- `label` — see Display.

Hour sets are keyed by base hour: 12Z = `[0,12,24,36,48,60,72,96,120]`, 00Z = `[0,12,24,36,48,60,72,84]`.

### `viewer` (UI)
- Renders the current chart in a full-screen `<img>`.
- Owns the persistent zoom state `{ scale, centerX, centerY }` via the pan/zoom library, applied to the image's container.
- Navigating (‹ ›, scrubber drag, or counter) swaps the `<img>` source **without resetting the transform**, so zoom + centre persist.
- Controls (Layout A, approved): slim top **info bar**; bottom bar with **‹ ›** arrows + **scrubber** + **counter** (`3/9`); **⤢ Reset** button to return to whole-chart view; a small **🔒 zoom locked** hint shown while zoomed.

## Data flow

1. On load, `runResolver` probes for the latest run.
2. `chartModel` builds the 8–9 charts.
3. Preload all chart images (~100 KB each, ~1 MB total) for instant navigation.
4. Show chart 0 (the analysis).
5. Navigation swaps the displayed image; the zoom transform is untouched, so the framed area persists across charts.

## Display

- Full-screen chart, gestures: pinch to zoom, drag to pan, double-tap to zoom in/out.
- **Info bar** shows valid time in the device's local time with UTC in parentheses, plus lead and run, e.g. (on a CEST device) *"Tue 2 Jun · 14:00 CEST (12:00 UTC) · +24 h · run 01 Jun 12Z"*. Chart 0 is labelled **"Analysis"**.

## Error handling

- **Run not yet published:** `runResolver` falls back to the prior run.
- **Individual chart 404:** verified on load; missing charts are dropped from the sequence rather than shown broken.
- **Image load failure:** inline retry.
- **Offline:** the service worker serves the app shell and the last-cached charts.

## PWA

- Web app **manifest** (name, icon, `standalone` display) so "Add to Home Screen" gives a full-screen app icon.
- **Service worker:** app shell cached cache-first; chart GIFs network-first (always prefer the latest) with cache fallback for offline.

## Testing

- `runResolver` — unit tests across the run-time boundaries (before ~0730, between, after ~1930, day rollover) and the fallback chain, using an injected clock and a stubbed availability probe.
- `chartModel` — unit tests for both hour-sets, URL construction, and valid-time / label formatting (including the CEST↔UTC rendering and the "Analysis" label).
- Zoom / pan / navigation gestures and zoom-persistence — verified manually on the iPhone.

## Open considerations (non-blocking)

- Exact buffer hours for the `runResolver` candidate selection will be tuned during implementation (publish times are "around" 0730/1930).
- Local-time rendering assumes the device timezone; using the device's own timezone (rather than hard-coding CEST) is the natural implementation.
