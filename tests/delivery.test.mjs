import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const home=readFileSync('index.html','utf8');
const game=readFileSync('midnight-factory.html','utf8');
test('root path enters complete upstream game',()=>{assert.match(home,/midnight-factory\.html/);assert.ok(statSync('midnight-factory.html').size>200000)});
test('original rendering and gameplay scripts are present',()=>{assert.match(game,/game-canvas/);assert.match(game,/<script/);assert.match(game,/Worker|postMessage/);});
test('original license and attribution are preserved',()=>{const license=readFileSync('LICENSE','utf8');assert.match(license,/MIT License/);assert.match(readFileSync('ATLAS_FORK_DEVELOPMENT.md','utf8'),/Gakuseei\/Midnight-Factory/)});
