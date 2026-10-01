import {load,save} from '../utils/storage';
import {defaults} from './defaults';
import type {Settings} from '../types';
const K='strata.settings';
export const get=():Settings=>({...defaults,...load(K,{})});
export const set=(p:Partial<Settings>)=>save(K,{...get(),...p});
