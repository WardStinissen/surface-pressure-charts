// src/format.js

export function leadLabel(ff) {
  return ff === 0 ? 'Analysis' : `+${ff} h`;
}

function parts(date, options, timeZone) {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).formatToParts(date);
}

function part(ps, type) {
  const found = ps.find((p) => p.type === type);
  return found ? found.value : '';
}

export function formatValidTime(date, timeZone) {
  const ps = parts(
    date,
    { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false },
    timeZone,
  );
  return `${part(ps, 'weekday')} ${part(ps, 'day')} ${part(ps, 'month')} · ${part(ps, 'hour')}:${part(ps, 'minute')}`;
}

export function tzAbbr(date, timeZone) {
  const ps = parts(date, { timeZoneName: 'short' }, timeZone);
  return part(ps, 'timeZoneName');
}

export function formatRun(run) {
  const [y, m, d] = run.date.split('-').map(Number);
  const runTime = new Date(Date.UTC(y, m - 1, d, run.baseHour));
  const ps = parts(runTime, { day: 'numeric', month: 'short' }, 'UTC');
  const hh = String(run.baseHour).padStart(2, '0');
  return `${part(ps, 'day')} ${part(ps, 'month')} ${hh}Z`;
}
