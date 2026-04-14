export function formatNumber(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }
  return Intl.NumberFormat('en-US').format(value);
}

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}`;
}
