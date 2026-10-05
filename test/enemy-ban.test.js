import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEnemyBanned } from '../shared/enemyBans.js';
import { makeBattle, checkInvariants } from './helpers/battleHarness.js';
import { GameData } from '../server/match/gamedata.js';
import { DATA } from './match/harness.js';
import { createRng } from '../server/sim/rng.js';
import { setupMatchWaves, buildNormalWave, bountySpawns, buildUniteWave, previewOf } from '../server/match/waves.js';
import { draftBounty } from '../server/match/choices.js';
const key = 'enemy_1234_dsubrl';
test('深溟巢涌者 is banned by exact key, without banning 富营养的巢涌者', () => {
  assert.ok(isEnemyBanned(key)); assert.equal(isEnemyBanned('enemy_1234_dsubrl_2'), false);
});
test('banned delayed/count spawns do not leave pending enemies or prevent battle completion', () => {
  const h = makeBattle({ enemies: [{ key, time: 999, count: 5 }], timeLimit: 30 });
  assert.equal(h.b.total, 0); assert.equal(h.b._pending.length, 0);
  h.step(); assert.ok(h.b.finished); assert.equal(h.result().reason, 'cleared'); checkInvariants(h.b);
});
test('mixed waves count only allowed enemies and still clear after the last allowed kill', () => {
  const h = makeBattle({ content: 'none', enemies: [{ key, count: 5, time: 999 }, { key: 'enemy_1007_slime', time: 0 }], timeLimit: 30 });
  assert.equal(h.b.total, 1); h.step(); assert.equal(h.enemies().length, 1);
  h.b.kill(h.enemies()[0]); h.step(); assert.ok(h.b.finished); assert.equal(h.result().reason, 'cleared');
  assert.equal(h.result().total, 1); assert.equal(h.result().killed, 1); checkInvariants(h.b);
});
test('direct, inline-definition, and dynamic queue spawns cannot bypass the ban or increment total', () => {
  const h = makeBattle({ autoFinish: false, content: 'none' }); h.step();
  assert.equal(h.spawn(key), null);
  assert.equal(h.spawn('alias', { def: { ...DATA.enemies[key], key } }), null);
  h.b._queueSpawn({ enemyKey: key, count: 3, time: 0 }, true); h.step();
  assert.equal(h.enemies().length, 0); assert.equal(h.b.total, 0); assert.equal(h.b._pending.length, 0); checkInvariants(h.b);
});
test('banned enemy cannot be drafted, previewed, replayed as a bounty or sent to unite', () => {
  const gd = new GameData(DATA, 'mode_multi_normal');
  assert.equal(draftBounty({ enemyKey: key, draft: true }), false);
  const setup = setupMatchWaves(gd, createRng(42));
  const wave = buildNormalWave(gd, createRng(7), setup, 4);
  assert.deepEqual(bountySpawns(gd, 4, wave, [{ id: 'old', card: { enemyKey: key, count: 3, coin: 1 } }], 'p1'), []);
  assert.deepEqual(previewOf([{ enemyKey: key, count: 1 }]), []);
  const united = buildUniteWave(gd, [{ enemyKey: key, sourcePlayerId: 'p1' }], 1, 30);
  assert.ok(united.spawns.every(s => s.enemyKey !== key));
});
test('random setup and generated waves never contain the banned enemy across modes and seeds', () => {
  for (const mode of ['mode_multi_normal', 'mode_multi_hard', 'mode_multi_abyss', 'mode_single_funny']) {
    const gd = new GameData(DATA, mode);
    for (let seed = 1; seed <= 80; seed++) {
      const setup = setupMatchWaves(gd, createRng(seed));
      assert.ok(setup.picks.filter(Boolean).every(p => ![p.key, p.normal, p.elite].includes(key)));
      for (let round = 1; round <= 13; round++) {
        const wave = buildNormalWave(gd, createRng(seed), setup, round);
        assert.ok(wave.spawns.every(s => s.enemyKey !== key), `${mode}/${seed}/${round}`);
      }
    }
  }
});
