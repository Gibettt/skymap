import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names safely, resolving Tailwind conflicts.
 * Works even without a Tailwind CSS setup — acts as a reliable
 * class concatenator with deduplication.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
