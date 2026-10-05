import {test}from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync}from 'node:fs';
import {applyOwnedBonus}from '../tools/custom/owned-bonus.mjs';
import {getDefaultSource}from '../server/sim/simdata.js';
import {makeBattle,checkInvariants}from './helpers/battleHarness.js';
const data=JSON.parse(readFileSync(new URL('../data/chess.json',import.meta.url)));
test('ownership is assumed for all 266 ordinary/elite operator records, with no account requirement',()=>{
 const ops=Object.values(data).filter(c=>c.charId&&c.stats&&!c.isDiy);assert.equal(ops.length,266);assert.ok(ops.every(c=>c.ownedStatBonus===.1));
});
test('normal and elite Angelina both get 10% HP/ATK/DEF, without changing RES or cost',()=>{
 const ds=getDefaultSource();
 for(const [id,want]of [['chess_char_6_aglna2_a',[2072.4,690.8,451]],['chess_char_6_aglna2_b',[2437.6,812.9,531.3]]]){
 const d=ds.getChess(id);assert.deepEqual([d.stats.maxHp,d.stats.atk,d.stats.def],want);assert.equal(d.stats.res,0);assert.equal(d.stats.cost,18);
 const h=makeBattle({units:[{chessId:id,row:10,col:5}],content:'none',autoFinish:false,timeLimit:30});h.step();const u=h.unit(id);assert.deepEqual([u.base.maxHp,u.base.atk,u.base.def],want);assert.equal(u.hp,u.s.maxHp);checkInvariants(h.b);
 }
});
test('ownership multiplier is independent of a later skill/bond buff and does not double on redeploy',()=>{
 const id='chess_char_6_aglna2_a';const h=makeBattle({units:[{chessId:id,row:10,col:5}],content:'none',autoFinish:false,timeLimit:30});h.step();const u=h.unit(id);
 h.b.addBuff(u,{key:'test:skillAndBond',mods:{atkPct:1.8+.5,defPct:.4,hpPct:.2}});
 assert.ok(Math.abs(u.s.atk-628*1.1*3.3)<1e-6);assert.ok(Math.abs(u.s.def-410*1.1*1.4)<1e-6);assert.ok(Math.abs(u.s.maxHp-1884*1.1*1.2)<1e-6);
 h.b.kill(u);h.b.redeploy(u);assert.equal(u.base.atk,690.8);assert.equal(u.base.maxHp,2072.4);checkInvariants(h.b);
});
test('both Narant modules and none use the bonus once, including module attributes',()=>{
 const ds=getDefaultSource(),id='chess_char_5_narant_b',none=ds.getChess(id,{moduleId:'none'});
 for(const [mod,atk,def,hp]of [['uniequip_002_narant',49.5,49.5,0],['uniequip_003_narant',44,0,330]]){
 const d=ds.getChess(id,{moduleId:mod});assert.ok(Math.abs(d.stats.atk-none.stats.atk-atk)<1e-6);assert.ok(Math.abs(d.stats.def-none.stats.def-def)<1e-6);assert.ok(Math.abs(d.stats.maxHp-none.stats.maxHp-hp)<1e-6);
 assert.equal(ds.getChess(id,{moduleId:'none'}),none);
 }
});
test('build bonus is idempotent; changes only HP/ATK/DEF and their module contribution',()=>{
 const rec={charId:'char_test',stats:{maxHp:1000,atk:100,def:200,res:10,aspd:100},statsBase:{maxHp:900,atk:80,def:150},modules:[{attr:{maxHp:100,atk:20,def:50,aspd:7}}]};
 applyOwnedBonus(rec);assert.deepEqual(rec.stats,{maxHp:1100,atk:110,def:220,res:10,aspd:100});assert.deepEqual(rec.modules[0].attr,{maxHp:110,atk:22,def:55,aspd:7});const once=structuredClone(rec);applyOwnedBonus(rec);assert.deepEqual(rec,once);
 for(const r of [{stats:{maxHp:100,atk:10,def:20}},{charId:'diy',isDiy:true,stats:{maxHp:100,atk:10,def:20}}]){const old=structuredClone(r);applyOwnedBonus(r);assert.deepEqual(r,old);}
});
