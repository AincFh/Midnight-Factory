import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../midnight-factory.html',import.meta.url),'utf8');
const src=html.match(/<script id="worker-src" type="text\/plain">([\s\S]*?)<\/script>/)?.[1];
const sourceData=html.match(/CONTRACTS:\s*(\[[\s\S]*?\]),\s*\/\/ Original|CONTRACTS:\s*(\[[\s\S]*?\]),\s*COLORS:/);
const list=sourceData?.[1]||sourceData?.[2];
const contracts=vm.runInNewContext('('+list+')');
const worker=(config=contracts)=>{
 const events=[],context=vm.createContext({
  Config:{CONTRACTS:config,RESOURCES:Object.fromEntries(config.map(c=>[c.item,{value:2}])),
    MAP_W:12,MAP_H:12},postMessage:m=>events.push(m),
  self:{},performance:{now:()=>1000},setTimeout:()=>0,
 });
 vm.runInContext(src,context,{timeout:2000});
 // Prevent the unit tests from generating an unrelated full 250x250 map. The
 // actual worker's serialized field names are checked independently below.
 vm.runInContext('emitSave=()=>{postMessage({type:"save_stub"})}',context);
 const run=code=>vm.runInContext(code,context,{timeout:1000});
 return{events,run};
};
test('complete contract chain has five distinct real resource types and bounded prizes',()=>{
 assert.equal(contracts.length,5);
 assert.equal(new Set(contracts.map(x=>x.id)).size,5);
 assert.deepEqual(Array.from(contracts,x=>x.item),['iron_ore','copper_ore','iron_bar','steel','circuit']);
 assert.ok(contracts.every(x=>x.quantity>0&&x.rewardRP>0&&x.rewardMoney>0));
});
test('claiming without the real Seller output is forbidden and has zero side effects',()=>{
 const w=worker();
 const before=w.run('JSON.stringify({money:state.money,rp:state.rp,stage:state.contractStage})');
 assert.equal(w.run('claimFactoryContract(0)'),false);
 assert.equal(w.run('claimFactoryContract("0")'),false);
 assert.equal(w.run('claimFactoryContract(1)'),false);
 assert.equal(w.run('JSON.stringify({money:state.money,rp:state.rp,stage:state.contractStage})'),before);
 assert.equal(w.events.length,0);
});
test('actual sold-item ledger progress unlocks the reward only at the exact threshold',()=>{
 const w=worker();
 w.run('statTotals.iron_ore=5');
 const partial=JSON.parse(w.run('JSON.stringify(contractStatus())'));
 assert.equal(partial.progress,5);
 assert.equal(w.run('claimFactoryContract(0)'),false);
 w.run('statTotals.iron_ore=6');
 assert.equal(w.run('claimFactoryContract(0)'),true);
 const paid=JSON.parse(w.run('JSON.stringify({money:state.money,rp:state.rp,stage:state.contractStage,baseline:state.contractBaseline})'));
 assert.deepEqual(paid,{money:235,rp:12,stage:1,baseline:0});
 assert.equal(w.events.filter(x=>x.type==='contract_claimed').length,1);
 assert.equal(w.run('claimFactoryContract(0)'),false,'old-stage retry must not grant even one cent');
 assert.equal(w.run('claimFactoryContract(1)'),false,'next stage is not completed');
});
test('next-stage sales prior to claim are excluded by baseline for each export contract',()=>{
 const w=worker();
 w.run('statTotals.copper_ore=50;statTotals.iron_ore=6;');
 assert.equal(w.run('claimFactoryContract(0)'),true);
 const progress=JSON.parse(w.run('JSON.stringify(contractStatus())'));
 assert.equal(progress.stage,1);
 assert.equal(progress.progress,0);
 assert.equal(w.run('claimFactoryContract(1)'),false);
 w.run('statTotals.copper_ore=57;');
 assert.equal(w.run('claimFactoryContract(1)'),false);
 w.run('statTotals.copper_ore=58;');
 assert.equal(w.run('claimFactoryContract(1)'),true);
 assert.equal(w.run('state.rp'),37);
});
test('all five rewards can be settled once from five separate real sale counters',()=>{
 const w=worker();
 for(let i=0;i<contracts.length;i++){
  const c=contracts[i];
  w.run('statTotals['+JSON.stringify(c.item)+']='+JSON.stringify(c.quantity)+';');
  assert.equal(w.run('claimFactoryContract('+i+')'),true,i+' '+c.id);
  assert.equal(w.run('claimFactoryContract('+i+')'),false);
 }
 const finished=JSON.parse(w.run('JSON.stringify(contractStatus())'));
 assert.equal(finished.done,true);
 assert.equal(w.run('claimFactoryContract(5)'),false);
 assert.equal(w.events.filter(x=>x.type==='contract_claimed').length,5);
 assert.equal(w.run('state.money'),200+contracts.reduce((a,x)=>a+x.rewardMoney,0));
 assert.equal(w.run('state.rp'),contracts.reduce((a,x)=>a+x.rewardRP,0));
});
test('the same worker that sells items owns delivery progress, save fields and payouts',()=>{
 assert.match(src,/statTotals\[it\.type\]=\(statTotals\[it\.type\]\|\|0\)\+1/);
 assert.match(src,/contractStage:state\.contractStage,contractBaseline:state\.contractBaseline/);
 assert.match(src,/case 'claim_contract'/);
 assert.match(src,/state\.money\+=current\.rewardMoney/);
 assert.match(src,/state\.rp\+=current\.rewardRP/);
 assert.match(src,/contractBoard:\(_tickN%4===0\?contractStatus\(\):undefined\)/);
 assert.match(html,/id="factory-contract-btn"/);
 assert.match(html,/id="factory-contract-claim"/);
 assert.match(html,/id="factory-contract-overlay"/);
});
test('original full worker script remains syntactically valid without a bundler',()=>{
 assert.ok(src?.length>50000);
 assert.doesNotThrow(()=>new vm.Script('const Config={};\n'+src));
 const main=html.slice(html.indexOf('<script>')+8,html.lastIndexOf('</script>'));
 assert.ok(main.length>100000);
 assert.doesNotThrow(()=>new vm.Script(main));
});
