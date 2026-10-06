/**
 * Dates the way owners say them: "Wed 14 October", "Today, 10:42". Built by
 * hand, so every browser shows the same thing (ICU varies: "Sept", commas).
 */
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const short = (word: string) => word.slice(0, 3);

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "10:42" (24-hour) */
export function formatClock(date: Date | string) {
  const value = new Date(date);
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

/** "Wednesday 14 October" */
export function formatLongDate(date: Date | string) {
  const value = new Date(date);
  return `${DAYS[value.getDay()]} ${value.getDate()} ${MONTHS[value.getMonth()]}`;
}

/** "Wed 14 October" */
export function formatDate(date: Date | string) {
  const value = new Date(date);
  return `${short(DAYS[value.getDay()]!)} ${value.getDate()} ${MONTHS[value.getMonth()]}`;
}

/** "14 Oct" */
export function formatDayMonth(date: Date | string) {
  const value = new Date(date);
  return `${value.getDate()} ${short(MONTHS[value.getMonth()]!)}`;
}

/** "Wed 14 Oct" */
export function formatShortDate(date: Date | string) {
  const value = new Date(date);
  return `${short(DAYS[value.getDay()]!)} ${value.getDate()} ${short(MONTHS[value.getMonth()]!)}`;
}

/** "Today, 10:42", "Yesterday, 18:05", or "Sun 4 Oct, 21:47" */
export function formatWhen(date: Date | string, now = new Date()) {
  const value = new Date(date);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(value, now)) return `Today, ${formatClock(value)}`;
  if (isSameDay(value, yesterday)) return `Yesterday, ${formatClock(value)}`;
  return `${formatShortDate(value)}, ${formatClock(value)}`;
}

/** "10:42" today, "Sun 4 Oct" before */
export function formatShortWhen(date: Date | string, now = new Date()) {
  const value = new Date(date);
  return isSameDay(value, now) ? formatClock(value) : formatShortDate(value);
}

/** "Tue" for chart axes, "Today" for today */
export function formatWeekday(date: Date, now = new Date()) {
  return isSameDay(date, now) ? "Today" : short(DAYS[date.getDay()]!);
}

/** "1.2 MB" */
export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Change from `previous` to `current` in whole percent, or null when there's nothing to compare. */
export function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
