import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | number | string, formatStr = 'PPp'): string {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    return String(date);
  }
}

const UPPERCASE_WORDS = new Set(['id', 'crm', 'api', 'url', 'ui']);

export function humanizeKey(value?: string | null): string {
  if (!value) {
    return '';
  }
  return value
    .replace(/[_\-\s]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const normalized = word.toLowerCase();
      if (UPPERCASE_WORDS.has(normalized)) {
        return normalized.toUpperCase();
      }
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(' ');
}

export function getEntityLabel(entity?: { name?: string; label?: string } | null): string {
  if (!entity) {
    return '';
  }
  return entity.label || humanizeKey(entity.name);
}

export function getFieldLabel(
  field?: { name?: string; label?: string } | null,
  fallbackName?: string
): string {
  if (!field) {
    return humanizeKey(fallbackName);
  }
  return field.label || humanizeKey(field.name || fallbackName);
}
