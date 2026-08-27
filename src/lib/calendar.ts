export function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function startOfSundayWeek(date = new Date()) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

export function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function memberWindow(date = new Date()) {
  const start = startOfSundayWeek(date);
  return { start, end: addDays(start, 13) };
}

export function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
  return { start, end };
}

/** Full Sunday-to-Saturday weeks covering a month, so calendars render whole rows. */
export function monthGridRange(date = new Date()) {
  const { start, end } = monthBounds(date);
  return { start: startOfSundayWeek(start), end: addDays(startOfSundayWeek(end), 6) };
}

export function eachDay(start: Date, end: Date) {
  const days: Date[] = [];
  for (let day = new Date(start); day <= end; day = addDays(day, 1)) days.push(new Date(day));
  return days;
}

export function monthGridDays(date = new Date(), weeks = 6) {
  const { start } = monthGridRange(date);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
}

export function todayISODate() {
  return toISODate(new Date());
}

/** Midday parse so an ISO meal date never shifts a day across time zones. */
export function parseMealDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`);
}

export function formatMealDate(isoDate: string, options: Intl.DateTimeFormatOptions) {
  return parseMealDate(isoDate).toLocaleDateString(undefined, options);
}

export function formatMonthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
