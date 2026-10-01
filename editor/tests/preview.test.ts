import {describe,it,expect} from 'vitest';
import {bundle} from '../src/preview/bundle';
import {seedFiles} from '../src/filesystem/seed';
describe('preview',()=>{it('bundles html',()=>{expect(bundle(seedFiles)).toContain('Hello')});it('empty',()=>{expect(bundle([])).toContain('No HTML')})});
