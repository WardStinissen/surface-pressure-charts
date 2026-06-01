// src/viewer.js
import { leadLabel, formatValidTime, tzAbbr, formatRun } from './format.js';

const Panzoom = window.Panzoom;
const DEVICE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const DOUBLE_TAP_MS = 300;
const TAP_MOVE_PX = 10;
const ZOOM_IN_SCALE = 2.5;

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
  const pz = Panzoom(frame, {
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

  // Keep the zoom UI (reset button + lock chip) in sync with the zoom level
  frame.addEventListener('panzoomchange', updateZoomUi);

  // Double-tap to toggle zoom — gated to genuine single-finger taps so it does
  // not mis-fire at the end of a pan drag or pinch (which emit extra pointerups).
  let activePointers = 0;
  let multiTouch = false;
  let moved = false;
  let downX = 0;
  let downY = 0;
  let downTime = 0;
  let lastTapTime = 0;

  frame.addEventListener('pointerdown', (e) => {
    activePointers += 1;
    if (activePointers > 1) {
      multiTouch = true;
      return;
    }
    downX = e.clientX;
    downY = e.clientY;
    downTime = e.timeStamp;
    moved = false;
  });

  frame.addEventListener('pointermove', (e) => {
    if (activePointers === 1 && !moved) {
      if (Math.abs(e.clientX - downX) > TAP_MOVE_PX || Math.abs(e.clientY - downY) > TAP_MOVE_PX) {
        moved = true;
      }
    }
  });

  function onPointerUp(e) {
    activePointers = Math.max(0, activePointers - 1);
    if (activePointers > 0) return; // wait until every finger is lifted

    const wasTap = !multiTouch && !moved && e.timeStamp - downTime <= DOUBLE_TAP_MS;
    multiTouch = false;
    if (!wasTap) {
      lastTapTime = 0;
      return;
    }

    if (e.timeStamp - lastTapTime < DOUBLE_TAP_MS) {
      if (pz.getScale() > 1.01) pz.reset();
      else pz.zoomToPoint(ZOOM_IN_SCALE, e);
      lastTapTime = 0;
    } else {
      lastTapTime = e.timeStamp;
    }
  }

  frame.addEventListener('pointerup', onPointerUp);
  frame.addEventListener('pointercancel', () => {
    activePointers = Math.max(0, activePointers - 1);
    if (activePointers === 0) multiTouch = false;
    moved = true; // invalidate any pending tap from this gesture
  });

  // Reveal controls
  scrub.max = String(charts.length - 1);
  infobar.hidden = false;
  botbar.hidden = false;

  render();
  updateZoomUi();
}
