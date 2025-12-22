import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Indian Rupee (INR) currency.
 * Uses Indian numbering system (lakhs, crores).
 * @param amount - The amount to format
 * @param options - Optional formatting options
 * @returns Formatted currency string with ₹ symbol
 */
export function formatCurrency(
  amount: number,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
  } = {}
): string {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    compact = false,
  } = options;

  // For compact notation (₹1.2L, ₹5K)
  if (compact) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

/**
 * Format a number using Indian numbering system without currency symbol.
 * @param value - The number to format
 * @returns Formatted number string
 */
export function formatIndianNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}
