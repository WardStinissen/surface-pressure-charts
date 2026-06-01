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
