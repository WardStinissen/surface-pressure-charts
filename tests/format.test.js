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
