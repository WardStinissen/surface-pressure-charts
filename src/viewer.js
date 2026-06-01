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
