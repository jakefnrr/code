import {describe,it,expect} from 'vitest';
import {exec} from '../src/terminal/shell';
describe('shell',()=>{it('ls/echo/help',()=>{expect(exec('ls',['/a']).out).toContain('/a');expect(exec('echo hi',[]).out).toBe('hi');expect(exec('bogus',[]).err).toContain('not found')})});
