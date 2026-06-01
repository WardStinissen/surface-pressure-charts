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
