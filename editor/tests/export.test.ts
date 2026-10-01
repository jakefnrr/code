import {describe,it,expect} from 'vitest';
import {zipEntrySafe} from '../src/security/zipSafety';
import {exec} from '../src/terminal/shell';
describe('export/security',()=>{it('blocks traversal',()=>{expect(zipEntrySafe('../a')).toBe(false)});it('shell sandboxed',()=>{expect(exec('rm -rf /',[]).err).toContain('not found')})});
