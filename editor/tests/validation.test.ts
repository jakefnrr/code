import {describe,it,expect} from 'vitest';
import {safePath,safeName} from '../src/validation/paths';
import {zipEntrySafe} from '../src/security/zipSafety';
describe('validation',()=>{it('paths',()=>{expect(safePath('/a/b')).toBe(true);expect(safePath('../x')).toBe(false);expect(safeName('a.ts')).toBe(true);expect(safeName('../x')).toBe(false)});it('zip traversal blocked',()=>{expect(zipEntrySafe('../../etc/passwd')).toBe(false);expect(zipEntrySafe('a/b.ts')).toBe(true)})});
