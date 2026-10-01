import {describe,it,expect} from 'vitest';
import {defaults} from '../src/settings/defaults';
describe('settings',()=>{it('defaults',()=>{expect(defaults.fontSize).toBe(14);expect(defaults.theme).toBe('abyss')})});
