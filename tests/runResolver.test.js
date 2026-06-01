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
