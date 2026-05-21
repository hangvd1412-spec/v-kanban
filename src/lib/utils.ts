import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function getDeadlineStatus(deadlineDate?: string, deadlineTime?: string): 'NORMAL' | 'DUE_SOON' | 'OVERDUE' {
  if (!deadlineDate) return 'NORMAL';
  
  const now = new Date();
  const deadline = new Date(`${deadlineDate}T${deadlineTime || '23:59:59'}`);
  
  if (isNaN(deadline.getTime())) return 'NORMAL';
  
  const timeDiff = deadline.getTime() - now.getTime();
  
  if (timeDiff < 0) return 'OVERDUE';
  if (timeDiff <= 24 * 60 * 60 * 1000) return 'DUE_SOON';
  
  return 'NORMAL';
}
