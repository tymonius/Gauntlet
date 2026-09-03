#!/usr/bin/env node
import { loadCurrentGameAuthority } from '../current-game-authority.mjs';
import { validateFaceCatalogContract } from './model.mjs';

const authority = await loadCurrentGameAuthority();
const summary = validateFaceCatalogContract(authority);
console.log(JSON.stringify(summary, null, 2));
