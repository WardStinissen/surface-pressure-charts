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
    // When an updated service worker takes control, reload once so the new app
    // code is used immediately rather than on a later visit.
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// iOS Safari ignores user-scalable=no, so a pinch that starts off the chart
// zooms the whole page; the fixed controls then shift out of alignment and feel
// unresponsive until an orientation change resets the zoom. Blocking Safari's
// proprietary gesture events stops page zoom. The chart's own pinch uses pointer
// events (Panzoom) and is unaffected.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}

boot();
