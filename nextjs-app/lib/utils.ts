import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  locale = "id-ID",
  currency = "IDR"
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string, locale = "id-ID") {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale);
}

export function formatTime(date: Date | string, locale = "id-ID") {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(locale);
}

export function formatDateTime(date: Date | string, locale = "id-ID") {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(locale);
}

export function generateTrackingCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PK${timestamp}${randomStr}`;
}

export function parseError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function isValidPhone(phone: string): boolean {
  const re = /^(\+62|62|0)[0-9]{9,12}$/;
  return re.test(phone);
}
