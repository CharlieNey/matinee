/** Performance dates use the visitor's local calendar, matching the editor. */
export function localDay(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function performanceDateError(value: string, today = localDay()): string | null {
  if (!value) return "Choose the performance date first";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Choose a valid performance date";
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return "Choose a valid performance date";
  }
  return value > today ? "Performance date can’t be in the future" : null;
}
