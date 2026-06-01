# Surface Pressure Charts Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-friendly static PWA that shows the latest UK Met Office surface pressure charts, lets you navigate across forecast steps, and zoom/pan with the zoom and centre preserved across charts for location comparison.

**Architecture:** Plain HTML/CSS/JS, no build step. Two pure logic modules (`runResolver`, `chartModel`) plus a `format` helper are unit-tested with Node's built-in test runner. A thin browser layer (`availability`, `viewer`, `main`) wires them to the DOM and a vendored pan/zoom library. Charts are loaded as `<img>` (no CORS needed); the latest run is found by probing image URLs. Deployed as static files to GitHub Pages.

**Tech Stack:** Vanilla ES modules, `@panzoom/panzoom` (vendored single file), `node:test` for unit tests, a service worker + web manifest for PWA install.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json` | `type: module` + `test` script (no dependencies installed) |
| `src/runResolver.js` | Pure: build run objects, list newest-first candidates, resolve the latest available run via an injected availability probe |
| `src/chartModel.js` | Pure: hour-sets per run, build chart URL, compute valid time, build the ordered chart list |
| `src/format.js` | Pure: human labels (lead, valid time, tz abbreviation, run label) |
| `src/availability.js` | Browser: probe an image URL via `Image()`; run-availability check |
| `src/viewer.js` | Browser UI: render chart, navigation (arrows/scrubber), panzoom integration, double-tap, reset, zoom-locked hint |
| `src/main.js` | Browser bootstrap: resolve run → build charts → preload/drop-missing → init viewer; error UI |
| `index.html` | App shell / DOM |
| `styles.css` | Layout A styling |
| `vendor/panzoom.min.js` | Vendored pan/zoom library |
| `manifest.webmanifest` | PWA manifest |
| `icon.svg` | App icon |
| `sw.js` | Service worker (shell cache-first, charts network-first) |
| `tests/runResolver.test.js` | Unit tests for `runResolver` |
| `tests/chartModel.test.js` | Unit tests for `chartModel` |
| `tests/format.test.js` | Unit tests for `format` |

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `src/`, `tests/`, `vendor/` (directories, via the files placed in them in later tasks)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "surface-pressure-charts",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Verify the test runner works with no tests yet**

Run: `node --test`
Expected: exits 0 with output like `tests 0` / `pass 0` (no test files found is fine).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: project scaffold with node:test runner"
```

---

## Task 2: `runResolver` (pure)

A run is `{ date: 'YYYY-MM-DD', baseHour: 0|12, code: 'FSXX00T'|'FSXX12T', timestamp: 'YYYY-MM-DDTHH00' }`. Publish buffers: the 12Z run is treated as available after 20:00 UTC, the 00Z run after 08:00 UTC; otherwise the previous run is the newest candidate. `resolveLatestRun` walks candidates newest-first and returns the first whose analysis image is available.

**Files:**
- Create: `src/runResolver.js`
- Test: `tests/runResolver.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/runResolver.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeRun, runCode, newestCandidate, previousRun, candidateRuns, resolveLatestRun,
} from '../src/runResolver.js';

test('runCode maps base hour to chart code', () => {
  assert.equal(runCode(0), 'FSXX00T');
  assert.equal(runCode(12), 'FSXX12T');
});

test('makeRun builds a full run object', () => {
  assert.deepEqual(makeRun('2026-06-01', 12), {
    date: '2026-06-01', baseHour: 12, code: 'FSXX12T', timestamp: '2026-06-01T1200',
  });
  assert.deepEqual(makeRun('2026-06-01', 0), {
    date: '2026-06-01', baseHour: 0, code: 'FSXX00T', timestamp: '2026-06-01T0000',
  });
});

test('newestCandidate after 20:00 UTC is today 12Z', () => {
  assert.deepEqual(newestCandidate(new Date('2026-06-01T21:00:00Z')), makeRun('2026-06-01', 12));
});

test('newestCandidate between 08:00 and 20:00 UTC is today 00Z', () => {
  assert.deepEqual(newestCandidate(new Date('2026-06-01T10:00:00Z')), makeRun('2026-06-01', 0));
});

test('newestCandidate before 08:00 UTC is yesterday 12Z', () => {
  assert.deepEqual(newestCandidate(new Date('2026-06-01T05:00:00Z')), makeRun('2026-05-31', 12));
});

test('previousRun steps 12Z -> same-day 00Z -> previous-day 12Z', () => {
  assert.deepEqual(previousRun(makeRun('2026-06-01', 12)), makeRun('2026-06-01', 0));
  assert.deepEqual(previousRun(makeRun('2026-06-01', 0)), makeRun('2026-05-31', 12));
});

test('candidateRuns lists newest-first', () => {
  assert.deepEqual(candidateRuns(new Date('2026-06-01T21:00:00Z'), 4), [
    makeRun('2026-06-01', 12),
    makeRun('2026-06-01', 0),
    makeRun('2026-05-31', 12),
    makeRun('2026-05-31', 0),
  ]);
});

test('resolveLatestRun returns the first available candidate', async () => {
  const available = makeRun('2026-06-01', 0);
  const isAvailable = async (run) => run.timestamp === available.timestamp;
  const result = await resolveLatestRun(new Date('2026-06-01T21:00:00Z'), isAvailable);
  assert.deepEqual(result, available);
});

test('resolveLatestRun returns null when nothing is available', async () => {
  const result = await resolveLatestRun(new Date('2026-06-01T21:00:00Z'), async () => false, 3);
  assert.equal(result, null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/runResolver.test.js`
Expected: FAIL — `Cannot find module '../src/runResolver.js'`.

- [ ] **Step 3: Write the implementation**

```js
// src/runResolver.js

export function runCode(baseHour) {
  return baseHour === 0 ? 'FSXX00T' : 'FSXX12T';
}

function isoDate(y, monthZeroBased, d) {
  const mm = String(monthZeroBased + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

export function makeRun(date, baseHour) {
  const hh = baseHour === 0 ? '0000' : '1200';
  return { date, baseHour, code: runCode(baseHour), timestamp: `${date}T${hh}` };
}

// Most recent run that could plausibly be published, given approximate publish times.
export function newestCandidate(now) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const hour = now.getUTCHours();
  const today = isoDate(y, m, d);
  if (hour >= 20) return makeRun(today, 12);
  if (hour >= 8) return makeRun(today, 0);
  const yd = new Date(Date.UTC(y, m, d));
  yd.setUTCDate(yd.getUTCDate() - 1);
  return makeRun(isoDate(yd.getUTCFullYear(), yd.getUTCMonth(), yd.getUTCDate()), 12);
}

export function previousRun(run) {
  if (run.baseHour === 12) return makeRun(run.date, 0);
  const [yy, mm, dd] = run.date.split('-').map(Number);
  const prev = new Date(Date.UTC(yy, mm - 1, dd));
  prev.setUTCDate(prev.getUTCDate() - 1);
  return makeRun(isoDate(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate()), 12);
}

export function candidateRuns(now, count = 5) {
  const runs = [];
  let run = newestCandidate(now);
  for (let i = 0; i < count; i++) {
    runs.push(run);
    run = previousRun(run);
  }
  return runs;
}

export async function resolveLatestRun(now, isAvailable, count = 5) {
  for (const run of candidateRuns(now, count)) {
    if (await isAvailable(run)) return run;
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/runResolver.test.js`
Expected: PASS — all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/runResolver.js tests/runResolver.test.js
git commit -m "feat: add run resolver with availability fallback"
```

---

## Task 3: `chartModel` (pure)

**Files:**
- Create: `src/chartModel.js`
- Test: `tests/chartModel.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/chartModel.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRun } from '../src/runResolver.js';
import { HOUR_SETS, BASE_URL, chartUrl, validTime, buildCharts } from '../src/chartModel.js';

test('hour sets match the two run types', () => {
  assert.deepEqual(HOUR_SETS[12], [0, 12, 24, 36, 48, 60, 72, 96, 120]);
  assert.deepEqual(HOUR_SETS[0], [0, 12, 24, 36, 48, 60, 72, 84]);
});

test('chartUrl builds the GIF URL with zero-padded forecast hour', () => {
  const run = makeRun('2026-06-01', 12);
  assert.equal(chartUrl(run, 0), `${BASE_URL}/2026-06-01T1200/FSXX12T_00.gif`);
  assert.equal(chartUrl(run, 24), `${BASE_URL}/2026-06-01T1200/FSXX12T_24.gif`);
  assert.equal(chartUrl(run, 120), `${BASE_URL}/2026-06-01T1200/FSXX12T_120.gif`);
});

test('validTime adds lead hours to the run time (UTC)', () => {
  const run = makeRun('2026-06-01', 12);
  assert.equal(validTime(run, 0).toISOString(), '2026-06-01T12:00:00.000Z');
  assert.equal(validTime(run, 24).toISOString(), '2026-06-02T12:00:00.000Z');
  assert.equal(validTime(makeRun('2026-06-01', 0), 84).toISOString(), '2026-06-04T12:00:00.000Z');
});

test('buildCharts returns ordered charts for a 12Z run', () => {
  const charts = buildCharts(makeRun('2026-06-01', 12));
  assert.equal(charts.length, 9);
  assert.equal(charts[0].ff, 0);
  assert.equal(charts[0].leadHours, 0);
  assert.equal(charts[8].ff, 120);
  assert.equal(charts[1].url, `${BASE_URL}/2026-06-01T1200/FSXX12T_12.gif`);
  assert.equal(charts[2].validTime.toISOString(), '2026-06-02T12:00:00.000Z');
});

test('buildCharts returns 8 charts for a 00Z run', () => {
  const charts = buildCharts(makeRun('2026-06-01', 0));
  assert.equal(charts.length, 8);
  assert.equal(charts[7].ff, 84);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/chartModel.test.js`
Expected: FAIL — `Cannot find module '../src/chartModel.js'`.

- [ ] **Step 3: Write the implementation**

```js
// src/chartModel.js

export const BASE_URL =
  'https://data.consumer-digital.api.metoffice.gov.uk/v1/surface-pressure/colour';

export const HOUR_SETS = {
  0: [0, 12, 24, 36, 48, 60, 72, 84],
  12: [0, 12, 24, 36, 48, 60, 72, 96, 120],
};

export function chartUrl(run, ff) {
  const ffStr = String(ff).padStart(2, '0');
  return `${BASE_URL}/${run.timestamp}/${run.code}_${ffStr}.gif`;
}

export function validTime(run, ff) {
  const [y, m, d] = run.date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, run.baseHour + ff));
}

export function buildCharts(run) {
  return HOUR_SETS[run.baseHour].map((ff) => ({
    ff,
    leadHours: ff,
    url: chartUrl(run, ff),
    validTime: validTime(run, ff),
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/chartModel.test.js`
Expected: PASS — all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/chartModel.js tests/chartModel.test.js
git commit -m "feat: add chart model (hour sets, urls, valid times)"
```

---

## Task 4: `format` (pure)

Produces the display strings. `formatValidTime`/`tzAbbr` take an explicit `timeZone` so the app can render device-local time while tests stay deterministic with `'UTC'`.

**Files:**
- Create: `src/format.js`
- Test: `tests/format.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/format.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRun } from '../src/runResolver.js';
import { leadLabel, formatValidTime, tzAbbr, formatRun } from '../src/format.js';

test('leadLabel labels the analysis and forecast steps', () => {
  assert.equal(leadLabel(0), 'Analysis');
  assert.equal(leadLabel(24), '+24 h');
  assert.equal(leadLabel(120), '+120 h');
});

test('formatValidTime renders weekday, day, month and 24h time', () => {
  const d = new Date('2026-06-01T12:00:00Z'); // Monday
  assert.equal(formatValidTime(d, 'UTC'), 'Mon 1 Jun · 12:00');
});

test('tzAbbr returns the short timezone name', () => {
  assert.equal(tzAbbr(new Date('2026-06-01T12:00:00Z'), 'UTC'), 'UTC');
});

test('formatRun renders the run date and base hour', () => {
  assert.equal(formatRun(makeRun('2026-06-01', 12)), '1 Jun 12Z');
  assert.equal(formatRun(makeRun('2026-06-01', 0)), '1 Jun 00Z');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/format.test.js`
Expected: FAIL — `Cannot find module '../src/format.js'`.

- [ ] **Step 3: Write the implementation**

```js
// src/format.js

export function leadLabel(ff) {
  return ff === 0 ? 'Analysis' : `+${ff} h`;
}

function parts(date, options, timeZone) {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).formatToParts(date);
}

function part(ps, type) {
  const found = ps.find((p) => p.type === type);
  return found ? found.value : '';
}

export function formatValidTime(date, timeZone) {
  const ps = parts(
    date,
    { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false },
    timeZone,
  );
  return `${part(ps, 'weekday')} ${part(ps, 'day')} ${part(ps, 'month')} · ${part(ps, 'hour')}:${part(ps, 'minute')}`;
}

export function tzAbbr(date, timeZone) {
  const ps = parts(date, { timeZoneName: 'short' }, timeZone);
  return part(ps, 'timeZoneName');
}

export function formatRun(run) {
  const [y, m, d] = run.date.split('-').map(Number);
  const runTime = new Date(Date.UTC(y, m - 1, d, run.baseHour));
  const ps = parts(runTime, { day: 'numeric', month: 'short' }, 'UTC');
  const hh = String(run.baseHour).padStart(2, '0');
  return `${part(ps, 'day')} ${part(ps, 'month')} ${hh}Z`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/format.test.js`
Expected: PASS — all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/format.js tests/format.test.js
git commit -m "feat: add label formatting helpers"
```

---

## Task 5: `availability` (browser probe)

Thin browser-only module (uses the `Image` global), so it is verified manually rather than unit-tested.

**Files:**
- Create: `src/availability.js`

- [ ] **Step 1: Write the implementation**

```js
// src/availability.js
import { chartUrl } from './chartModel.js';

export function probeImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

// For runResolver: a run exists if its analysis chart (ff=0) loads.
export function runAvailable(run) {
  return probeImage(chartUrl(run, 0));
}
```

- [ ] **Step 2: Verify it parses (no syntax errors)**

Run: `node --check src/availability.js`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/availability.js
git commit -m "feat: add image availability probe"
```

---

## Task 6: App shell and styling

Layout A: full-screen chart, slim info bar, bottom bar with arrows + range scrubber + counter, reset button, zoom-locked chip, error overlay.

**Files:**
- Create: `index.html`
- Create: `styles.css`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#0b1220">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="apple-touch-icon" href="icon.svg">
  <title>Surface Pressure Charts</title>
  <link rel="stylesheet" href="styles.css">
  <script src="vendor/panzoom.min.js"></script>
</head>
<body>
  <div id="app">
    <div id="stage" class="stage">
      <img id="chart" class="chart-img" alt="Surface pressure chart" draggable="false">
    </div>

    <div id="infobar" class="infobar" hidden></div>
    <div id="lockchip" class="lockchip" hidden>🔒 zoom locked</div>
    <button id="reset" class="reset-btn" type="button" hidden aria-label="Reset zoom">⤢</button>

    <div id="botbar" class="botbar" hidden>
      <button id="prev" class="nav-arrow" type="button" aria-label="Previous chart">‹</button>
      <input id="scrub" class="scrub" type="range" min="0" max="0" value="0" step="1" aria-label="Forecast step">
      <button id="next" class="nav-arrow" type="button" aria-label="Next chart">›</button>
      <span id="counter" class="counter"></span>
    </div>

    <div id="loading" class="overlay">Loading latest charts…</div>
    <div id="error" class="overlay" hidden></div>
  </div>

  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `styles.css`**

```css
:root {
  --bg: #0b1220;
  --panel: rgba(11, 18, 32, 0.92);
  --text: #dfe8f5;
  --muted: #8aa0c0;
  --accent: #5b9bff;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overscroll-behavior: none;
}

#app {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
}

.stage {
  flex: 1;
  position: relative;
  overflow: hidden;
  touch-action: none;            /* let panzoom own gestures */
  display: flex;
  align-items: center;
  justify-content: center;
  background: #cdd9e8;
}

.chart-img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  user-select: none;
  -webkit-user-drag: none;
  display: block;
}

.infobar {
  position: absolute;
  top: 0; left: 0; right: 0;
  padding: max(8px, env(safe-area-inset-top)) 12px 8px;
  background: var(--panel);
  color: var(--text);
  font-size: 13px;
  line-height: 1.3;
  backdrop-filter: blur(4px);
}

.lockchip {
  position: absolute;
  top: 52px; right: 10px;
  font-size: 11px;
  padding: 4px 9px;
  border-radius: 20px;
  background: rgba(91, 155, 255, 0.22);
  color: #bcd3ff;
  border: 1px solid rgba(91, 155, 255, 0.5);
}

.reset-btn {
  position: absolute;
  bottom: 78px; right: 12px;
  width: 44px; height: 44px;
  border-radius: 12px;
  background: var(--panel);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 18px;
}

.botbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
  background: var(--panel);
}

.nav-arrow {
  flex: none;
  width: 44px; height: 44px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: #04122e;
  font-size: 22px;
  font-weight: 800;
}

.nav-arrow:disabled { opacity: 0.35; }

.scrub { flex: 1; accent-color: var(--accent); height: 28px; }

.counter {
  flex: none;
  min-width: 38px;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  background: var(--bg);
  color: var(--muted);
  font-size: 15px;
}
```

- [ ] **Step 3: Verify the page loads (without JS behaviour yet)**

Run: `python3 -m http.server 8000`
Then open `http://localhost:8000/` — expect the "Loading latest charts…" overlay (JS modules will 404 until later tasks; that is fine for this step). Stop the server with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: add app shell and Layout A styling"
```

---

## Task 7: Vendor pan/zoom and build the viewer

`viewer.js` renders a chart, owns the persistent zoom transform, and wires navigation. The transform lives on the `<img>`; navigation only swaps `img.src`, so zoom + centre persist. Double-tap toggles between fit and zoomed-in. The reset button and zoom-locked chip appear only while zoomed.

**Files:**
- Create: `vendor/panzoom.min.js` (downloaded)
- Create: `src/viewer.js`

- [ ] **Step 1: Vendor the pan/zoom library**

Run:
```bash
mkdir -p vendor
curl -L "https://unpkg.com/@panzoom/panzoom@4/dist/panzoom.min.js" -o vendor/panzoom.min.js
test -s vendor/panzoom.min.js && echo "downloaded"
```
Expected: prints `downloaded` and the file is non-empty. It exposes a global `Panzoom`.

- [ ] **Step 2: Write `src/viewer.js`**

```js
// src/viewer.js
import { leadLabel, formatValidTime, tzAbbr, formatRun } from './format.js';

const Panzoom = window.Panzoom;
const DEVICE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const DOUBLE_TAP_MS = 300;
const ZOOM_IN_SCALE = 2.5;

function infoText(chart, run) {
  const local = `${formatValidTime(chart.validTime, DEVICE_TZ)} ${tzAbbr(chart.validTime, DEVICE_TZ)}`;
  const utc = `${formatValidTime(chart.validTime, 'UTC')} UTC`;
  return `${local} (${utc}) · ${leadLabel(chart.ff)} · run ${formatRun(run)}`;
}

export function initViewer({ run, charts }) {
  const img = document.getElementById('chart');
  const infobar = document.getElementById('infobar');
  const botbar = document.getElementById('botbar');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  const scrub = document.getElementById('scrub');
  const counter = document.getElementById('counter');
  const resetBtn = document.getElementById('reset');
  const lockchip = document.getElementById('lockchip');

  let index = 0;

  const pz = Panzoom(img, {
    minScale: 1,
    maxScale: 8,
    contain: 'inside',
    startScale: 1,
    cursor: 'grab',
  });

  function render() {
    const chart = charts[index];
    img.src = chart.url;
    infobar.textContent = infoText(chart, run);
    counter.textContent = `${index + 1}/${charts.length}`;
    scrub.value = String(index);
    prev.disabled = index === 0;
    next.disabled = index === charts.length - 1;
  }

  function go(to) {
    index = Math.max(0, Math.min(charts.length - 1, to));
    render();
  }

  function updateZoomUi() {
    const zoomed = pz.getScale() > 1.01;
    resetBtn.hidden = !zoomed;
    lockchip.hidden = !zoomed;
  }

  // Navigation
  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  scrub.addEventListener('input', () => go(Number(scrub.value)));
  resetBtn.addEventListener('click', () => pz.reset());

  // Zoom UI sync
  img.addEventListener('panzoomchange', updateZoomUi);

  // Double-tap / double-click to toggle zoom
  let lastTap = 0;
  img.addEventListener('pointerup', (e) => {
    const now = e.timeStamp;
    if (now - lastTap < DOUBLE_TAP_MS) {
      if (pz.getScale() > 1.01) pz.reset();
      else pz.zoomToPoint(ZOOM_IN_SCALE, e);
      lastTap = 0;
    } else {
      lastTap = now;
    }
  });

  // Reveal controls
  scrub.max = String(charts.length - 1);
  infobar.hidden = false;
  botbar.hidden = false;

  render();
  updateZoomUi();
}
```

- [ ] **Step 3: Verify it parses**

Run: `node --check src/viewer.js`
Expected: no output, exit 0. (It references `window`/`document` only at call time, so `--check` passes.)

- [ ] **Step 4: Commit**

```bash
git add vendor/panzoom.min.js src/viewer.js
git commit -m "feat: add viewer with persistent zoom and navigation"
```

---

## Task 8: Bootstrap (`main.js`) and error handling

Resolves the latest run, builds and preloads charts (dropping any that 404), then starts the viewer. Shows a clear message if nothing resolves.

**Files:**
- Create: `src/main.js`

- [ ] **Step 1: Write `src/main.js`**

```js
// src/main.js
import { resolveLatestRun } from './runResolver.js';
import { buildCharts } from './chartModel.js';
import { runAvailable, probeImage } from './availability.js';
import { initViewer } from './viewer.js';

function showError(message) {
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  if (loading) loading.hidden = true;
  error.textContent = message;
  error.hidden = false;
}

async function boot() {
  const loading = document.getElementById('loading');

  const run = await resolveLatestRun(new Date(), runAvailable);
  if (!run) {
    showError('No recent surface pressure charts are available. Please try again later.');
    return;
  }

  let charts = buildCharts(run);
  const present = await Promise.all(charts.map((c) => probeImage(c.url)));
  charts = charts.filter((_, i) => present[i]);

  if (charts.length === 0) {
    showError('The latest run has no available charts yet. Please try again later.');
    return;
  }

  if (loading) loading.hidden = true;
  initViewer({ run, charts });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
```

- [ ] **Step 2: Verify it parses**

Run: `node --check src/main.js`
Expected: no output, exit 0.

- [ ] **Step 3: Manually verify the full app in a browser**

Run: `python3 -m http.server 8000`
Open `http://localhost:8000/` in a desktop browser and confirm:
- The latest chart (Analysis) appears with an info bar like `… (… UTC) · Analysis · run … Z`.
- `›`/`‹` and the scrubber move through the charts; the counter updates (e.g. `1/9`).
- Scroll-to-zoom (desktop) then navigate: the zoom and centre stay put; the ⤢ button and 🔒 chip appear while zoomed; ⤢ resets.
Stop the server with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: bootstrap app, preload charts, drop missing, handle errors"
```

---

## Task 9: PWA (manifest, icon, service worker)

**Files:**
- Create: `icon.svg`
- Create: `manifest.webmanifest`
- Create: `sw.js`

- [ ] **Step 1: Create `icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#0b1220"/>
  <g fill="none" stroke="#5b9bff" stroke-width="10">
    <ellipse cx="180" cy="200" rx="60" ry="46"/>
    <ellipse cx="180" cy="200" rx="100" ry="78"/>
    <ellipse cx="340" cy="330" rx="52" ry="40"/>
    <ellipse cx="340" cy="330" rx="92" ry="72"/>
  </g>
  <text x="180" y="216" font-family="sans-serif" font-size="64" font-weight="700" fill="#dfe8f5" text-anchor="middle">H</text>
  <text x="340" y="346" font-family="sans-serif" font-size="56" font-weight="700" fill="#9a2330" text-anchor="middle">L</text>
</svg>
```

- [ ] **Step 2: Create `manifest.webmanifest`**

```json
{
  "name": "Surface Pressure Charts",
  "short_name": "Pressure",
  "description": "UK Met Office surface pressure charts viewer",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#0b1220",
  "theme_color": "#0b1220",
  "icons": [
    { "src": "icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 3: Create `sw.js`**

```js
// sw.js
const SHELL_CACHE = 'sp-shell-v1';
const CHART_HOST = 'data.consumer-digital.api.metoffice.gov.uk';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icon.svg',
  './vendor/panzoom.min.js',
  './src/main.js',
  './src/runResolver.js',
  './src/chartModel.js',
  './src/format.js',
  './src/availability.js',
  './src/viewer.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Chart GIFs: network-first (always prefer latest), fall back to cache.
  if (url.hostname === CHART_HOST) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // App shell: cache-first.
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
```

- [ ] **Step 4: Verify the service worker parses**

Run: `node --check sw.js`
Expected: no output, exit 0. (`self`/`caches` are referenced only at runtime.)

- [ ] **Step 5: Manually verify PWA install metadata**

Run: `python3 -m http.server 8000`
Open `http://localhost:8000/` in Chrome DevTools → Application tab:
- Manifest loads with name "Surface Pressure Charts" and the icon renders.
- Service worker registers and activates; the shell files appear in Cache Storage.
Stop the server with Ctrl-C.

- [ ] **Step 6: Commit**

```bash
git add icon.svg manifest.webmanifest sw.js
git commit -m "feat: add PWA manifest, icon and service worker"
```

---

## Task 10: Full test run, device check, and deploy

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run the full unit-test suite**

Run: `npm test`
Expected: PASS — all tests across the three suites pass (18 tests total).

- [ ] **Step 2: Create `README.md`**

```markdown
# Surface Pressure Charts

A static PWA that shows the latest UK Met Office surface pressure charts. Navigate
across forecast steps and zoom into a location; the zoom and centre persist as you
move between charts, so you can compare how a system evolves.

## Develop

Static files, no build step.

- Run tests: `npm test`
- Serve locally: `python3 -m http.server 8000`, then open http://localhost:8000/

## Deploy (GitHub Pages)

1. Push to a GitHub repository.
2. Settings → Pages → Build and deployment → Source: "Deploy from a branch",
   branch `main`, folder `/ (root)`.
3. Open the published URL on your iPhone in Safari, then Share → "Add to Home Screen".

## Data source

Charts are public GIFs from the Met Office consumer-digital API. Two runs per day:
morning (`FSXX00T`, 8 charts) and evening (`FSXX12T`, 9 charts). See
`docs/superpowers/specs/2026-06-01-surface-pressure-charts-design.md` for details.
```

- [ ] **Step 3: Manual device check (iPhone)**

Serve over your machine's LAN (`python3 -m http.server 8000`) and open `http://<your-computer-ip>:8000/` in iOS Safari. Confirm:
- Pinch to zoom, drag to pan, double-tap to toggle zoom all work.
- While zoomed, tapping `›`/`‹` keeps the same zoom and centre (a location stays framed across forecast steps).
- The ⤢ reset and 🔒 chip behave as designed.
- "Add to Home Screen" produces a full-screen app icon that launches the viewer.

- [ ] **Step 4: Commit and push**

```bash
git add README.md
git commit -m "docs: add README with develop and deploy instructions"
git branch -M main
# git remote add origin <your-repo-url>
# git push -u origin main
```

---

## Self-Review Notes

- **Spec coverage:** navigation (Task 7), zoom (Task 7), zoom+centre persistence across charts (Task 7, `render()` swaps `src` only), latest-run discovery with fallback (Tasks 2, 8), 00Z/12Z hour-sets (Task 3), drop-missing charts (Task 8), local+UTC labels with "Analysis" (Task 4, viewer `infoText`), error handling (Task 8), PWA (Task 9), GitHub Pages deploy (Task 10), tests for pure logic (Tasks 2–4). All spec sections map to a task.
- **Type/name consistency:** `makeRun`, `runCode`, `newestCandidate`, `previousRun`, `candidateRuns`, `resolveLatestRun` (Task 2); `BASE_URL`, `HOUR_SETS`, `chartUrl`, `validTime`, `buildCharts` (Task 3); `leadLabel`, `formatValidTime`, `tzAbbr`, `formatRun` (Task 4); `probeImage`, `runAvailable` (Task 5); `initViewer` (Task 7) — all referenced consistently where imported.
