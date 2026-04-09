import { formatDistanceToNow, format } from 'date-fns';

export function formatTimeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string): string {
  return format(new Date(date), 'MMM dd, yyyy HH:mm:ss');
}

export function formatShortDate(date: string): string {
  return format(new Date(date), 'MMM dd, HH:mm');
}

export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatAmount(amount: number, token = 'SOL'): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${token}`;
}

export function formatLatency(ms: number): string {
  return `${ms}ms`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}
