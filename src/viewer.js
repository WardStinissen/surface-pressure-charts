// src/viewer.js
import { leadLabel, formatValidTime, tzAbbr, formatRun } from './format.js';

const Panzoom = window.Panzoom;
const DEVICE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function infoText(chart, run) {
  const local = `${formatValidTime(chart.validTime, DEVICE_TZ)} ${tzAbbr(chart.validTime, DEVICE_TZ)}`;
  const utc = `${formatValidTime(chart.validTime, 'UTC')} UTC`;
  return `${local} (${utc}) · ${leadLabel(chart.ff)} · run ${formatRun(run)}`;
}

export function initViewer({ run, charts }) {
  const frame = document.getElementById('frame');
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

  // Panzoom is bound to the fixed-size frame (not the <img>), so its contain
  // bounds are correct immediately and do not depend on image load timing.
  // contain:'outside' keeps the frame covering the viewport: zoom in past 1x is
  // allowed and panning is bounded so the chart can't be dragged off-screen.
  // ('inside' would clamp the scale to 1 because the frame already fills the
  // parent, which silently disabled all zooming.)
  const pz = Panzoom(frame, {
    minScale: 1,
    maxScale: 8,
    contain: 'outside',
    startScale: 1,
    cursor: 'grab',
  });

  function render() {
    const chart = charts[index];
    let retried = false;
    img.onerror = () => {
      if (retried) return; // give up after one retry; leaves a broken image
      retried = true;
      const { url } = chart;
      img.src = '';
      setTimeout(() => {
        img.src = url;
      }, 500);
    };
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

  // Keep the zoom UI (reset button + lock chip) in sync with the zoom level
  frame.addEventListener('panzoomchange', updateZoomUi);

  // Zoom is via pinch only; the ⤢ reset button (shown while zoomed) returns to
  // the whole-chart view. There is deliberately no double-tap-to-zoom: it fired
  // accidentally when tapping near the bottom nav controls during fast browsing.

  // Reveal controls
  scrub.max = String(charts.length - 1);
  infobar.hidden = false;
  botbar.hidden = false;

  render();
  updateZoomUi();
}
