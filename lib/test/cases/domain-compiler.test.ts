import { describe, expect, it } from 'vitest';
import { compileDomain } from '../../services/DomainCompiler.ts';

describe('compileDomain', () => {
  it('allowlists fields and parameterizes values', () => {
    expect(compileDomain([['type', '=', 'opportunity'], ['name', 'ilike', 'office']], { type: 'l.type', name: 'l.name' })).toEqual({ sql: 'l.type = ? AND l.name ILIKE ?', params: ['opportunity', '%office%'] });
    expect(() => compileDomain([['unsafe', '=', 'x']], { type: 'l.type' })).toThrow('Unknown domain field');
  });
});
