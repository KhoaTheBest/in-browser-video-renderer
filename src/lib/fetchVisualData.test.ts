import { describe, expect, it } from 'vitest';
import { parseVisualJson } from './fetchVisualData';
import { templates } from '../data/templates';

const v = templates[0].visual;

describe('parseVisualJson', () => {
  it('accepts a bare visual', () => {
    expect(parseVisualJson(JSON.stringify(v))).toHaveLength(1);
  });
  it('accepts the items[] wrapper, including stringified visual_json', () => {
    const out = parseVisualJson(JSON.stringify({ items: [{ visual_data_id: 'abcdefghij', visual_json: JSON.stringify(v) }] }));
    expect(out[0].id).toBe('abcdefghij');
  });
  it('rejects invalid JSON and non-visuals with friendly errors', () => {
    expect(() => parseVisualJson('{')).toThrow(/valid JSON/);
    expect(() => parseVisualJson('{"fps":30}')).toThrow(/No renderable visual/);
  });
});
