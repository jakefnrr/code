import {describe,it,expect} from 'vitest';
import {register,all,run} from '../src/commands/registry';
describe('commands',()=>{it('registers and runs',()=>{let n=0;register({id:'t.x',title:'X',run:()=>{n++}});run('t.x');expect(n).toBe(1);expect(all().length).toBeGreaterThan(0)})});
