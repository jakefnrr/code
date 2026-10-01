import {describe,it,expect} from 'vitest';
import {openTab,closeTab,closeAll} from '../src/tabs/manager';
describe('tabs',()=>{it('opens/closes',()=>{let s={open:[],active:null as any};s=openTab(s,'/a');expect(s.open).toContain('/a');s=closeTab(s,'/a');expect(s.open.length).toBe(0);expect(closeAll().open.length).toBe(0)})});
