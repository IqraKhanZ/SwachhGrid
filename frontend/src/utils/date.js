import { formatDistanceToNow } from 'date-fns';

export function parseSafeDate(dateInput) {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    if (!dateInput.endsWith('Z') && !dateInput.includes('+') && !/T.*\d{2}-\d{2}/.test(dateInput)) {
      return new Date(dateInput + 'Z');
    }
  }
  return new Date(dateInput);
}

export function formatTimeAgo(dateInput) {
  try {
    const d = parseSafeDate(dateInput);
    if (isNaN(d.getTime())) return 'recently';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'recently';
  }
}
