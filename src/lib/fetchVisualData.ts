import type { VisualData } from '../types/visual';
import { isRenderable } from '../engine/timeline';

export type ImportedVisual = { id: string; label: string; visual: VisualData };

function toVisuals(data: unknown): ImportedVisual[] {
  const out: ImportedVisual[] = [];
  const add = (raw: unknown, id: string) => {
    const v = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw;
    if (isRenderable(v as Partial<VisualData>)) {
      const d = (v as VisualData).dimensions;
      out.push({ id, label: `${d.width}×${d.height} (${id.slice(0, 8)})`, visual: v as VisualData });
    }
  };
  const obj = data as { items?: Array<{ visual_data_id?: string; visual_json?: unknown }> };
  if (Array.isArray(obj?.items)) {
    obj.items.forEach((it, i) => add(it.visual_json, it.visual_data_id ?? `item-${i}`));
  } else {
    add(data, 'imported');
  }
  return out;
}

/** Parses pasted/uploaded JSON text into renderable visuals. Throws a friendly error otherwise. */
export function parseVisualJson(text: string): ImportedVisual[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That is not valid JSON.');
  }
  const visuals = toVisuals(data);
  if (visuals.length === 0) {
    throw new Error('No renderable visual found. Expected fps, durationInFrames, dimensions and scenes.');
  }
  return visuals;
}

/** Advanced: fetches visual JSON straight from a URL (the host must allow CORS). */
export async function fetchVisualData(url: string, token?: string): Promise<ImportedVisual[]> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }
  let res: Response;
  try {
    res = await fetch(parsed, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  } catch {
    throw new Error('Request failed. The server may be unreachable or may not allow cross-origin (CORS) requests.');
  }
  if (!res.ok) throw new Error(`Request failed with HTTP ${res.status}.`);
  return parseVisualJson(await res.text());
}
