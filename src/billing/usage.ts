const key = () => `render-usage-${new Date().toISOString().slice(0, 10)}`;

/** Soft, client-side counter. It is a convenience limit, not security. */
export function exportsToday(): number {
  try { return Number(localStorage.getItem(key())) || 0; } catch { return 0; }
}

export function recordExport(): void {
  try { localStorage.setItem(key(), String(exportsToday() + 1)); } catch { /* storage unavailable */ }
}
