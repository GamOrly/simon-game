// Hebrew locale, device local time; stored values stay ISO (ARCHITECTURE §2.5)
const formatter = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' });

export function formatFinishedAt(iso: string): string {
  return formatter.format(new Date(iso));
}
