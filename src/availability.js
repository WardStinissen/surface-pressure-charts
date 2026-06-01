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
