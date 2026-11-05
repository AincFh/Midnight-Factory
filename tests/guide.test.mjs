import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STEPS,COPY,guideStep,clampStep,normalizeLang} from '../atlas-guide-data.mjs';
const index=readFileSync('index.html','utf8'),guide=readFileSync('atlas-guide.mjs','utf8'),styles=readFileSync('atlas-guide.css','utf8');
test('bilingual seven-step onboarding is complete and maps to original game UI',()=>{
 assert.equal(STEPS.length,7);const source=readFileSync('midnight-factory.html','utf8');
 for(const s of STEPS){assert.ok(s.zh.title&&s.zh.body&&s.zh.hint);assert.ok(s.en.title&&s.en.body&&s.en.hint);const id=s.target.match(/data-id="([^"]+)"/)?.[1]||s.target.match(/#([a-z-0-9-]+)/)?.[1];assert.ok(id);assert.ok(source.includes(id),'upstream UI lacks target '+id)}
});
test('step limits and locale fallbacks are guarded',()=>{assert.equal(clampStep(-2),0);assert.equal(clampStep(500),6);assert.equal(clampStep(NaN),0);assert.equal(normalizeLang('fr'),'zh');assert.equal(normalizeLang('en'),'en');assert.equal(guideStep(99,'en').id,'backup')});
test('game is embedded intact, preserving direct game URL',()=>{assert.match(index,/src="\.\/midnight-factory\.html"/);assert.match(index,/src="\.\/atlas-guide\.mjs"/);assert.match(index,/Gakuseei/);assert.match(index,/ATLAS Fork/)});
test('guide only highlights upstream tools and preserves original export/import',()=>{assert.match(guide,/scrollIntoView/);assert.doesNotMatch(guide,/JSON\.parse\(/);assert.match(readFileSync('midnight-factory.html','utf8'),/export-save-btn/);assert.match(readFileSync('midnight-factory.html','utf8'),/import-save-btn/)});
test('mobile and reduced motion styles exist',()=>{assert.match(styles,/@media\(max-width:610px\)/);assert.match(styles,/prefers-reduced-motion/);assert.match(styles,/max-height/);});
test('localization includes authorship and licence preservation',()=>{assert.match(COPY.zh.credit,/Gakuseei/);assert.match(COPY.en.credit,/Gakuseei/);assert.match(readFileSync('LICENSE','utf8'),/MIT License/);});
