#!/usr/bin/env node
import { loadCurrentGameAuthority } from '../current-game-authority.mjs';
import { validateCurrentGameContract } from './model.mjs';

const authority = await loadCurrentGameAuthority();
const summary = validateCurrentGameContract(authority);
console.log(JSON.stringify(summary, null, 2));
