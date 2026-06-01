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
