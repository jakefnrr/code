import {describe,it,expect} from 'vitest';
import {searchAll,replaceAll} from '../src/search/engine';
import {seedFiles} from '../src/filesystem/seed';
describe('search',()=>{it('finds text',()=>{const h=searchAll(seedFiles,{query:'Strata',regex:false,caseSensitive:false,wholeWord:false,include:''});expect(h.length).toBeGreaterThan(0)});it('case sensitive',()=>{const h=searchAll(seedFiles,{query:'strata',regex:false,caseSensitive:true,wholeWord:false,include:''});expect(h.length).toBe(0)});it('replace',()=>{expect(replaceAll('aaa',{query:'a',regex:false,caseSensitive:true,wholeWord:false},'b')).toBe('bbb')})});
