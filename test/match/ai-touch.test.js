import { test } from 'node:test';
import assert from 'node:assert/strict';
import { botPickBand } from '../../server/match/bot.js';
import { makeMatch } from './harness.js';
const TOUCH = 'band_amedic';
test('three real humans and one AI: AI always prefers TOUCH across seeds and difficulties', () => {
  for (const difficulty of ['FUNNY', 'NORMAL', 'HARD', 'ABYSS']) for (let seed = 1; seed <= 30; seed++) {
    const h = makeMatch({ humans: 3, bots: 1, difficulty, seed, fake: true });
    try { assert.equal(botPickBand(h.m, h.ps('ai_0')), TOUCH); } finally { h.m.dispose(); }
  }
});
test('actual band draft assigns TOUCH to the AI regardless of turn order, preserving unique human picks', () => {
  const positions = new Set();
  for (let seed = 1; seed <= 24; seed++) {
    const h = makeMatch({ humans: 3, bots: 1, seed, fake: true }).start();
    try {
      h.m.enterBandDraft(); positions.add(h.m.draft.order.indexOf('ai_0'));
      for (let step = 0; step < 10 && h.m.phase === 'BAND_DRAFT'; step++) {
        const ps = h.ps(h.m.draftTurn());
        if (ps && !ps.isBot) {
          const band = h.m.gd.bandIds().find(id => id !== TOUCH && !h.m.bandTaken(id, ps.playerId));
          assert.equal(h.m.pickBand(ps, band).ok, true);
        }
        h.sched.advance(0);
      }
      assert.equal(h.ps('ai_0').bandId, TOUCH);
      assert.equal(h.m.phase, 'BATTLE_CHECK');
      assert.equal(new Set(h.m.order.map(p => p.bandId)).size, 4); h.invariants();
    } finally { h.m.dispose(); }
  }
  assert.equal(positions.size, 4, 'AI tested at every draft position');
});
test('when a human already chose TOUCH, the AI respects teammate ownership and uses its usual choice', () => {
  const h = makeMatch({ humans: 3, bots: 1, fake: true });
  try {
    h.m.draft = { picks: { p_0: TOUCH } };
    // At the lowest RNG draw, the normal weighted chooser picks the first strategy, not TOUCH.
    h.m.rngBots = () => 0;
    assert.equal(botPickBand(h.m, h.ps('ai_0')), h.m.gd.bandIds()[0]);
  } finally { h.m.dispose(); }
});
test('other team compositions and human autoplay keep the existing weighted chooser', () => {
  for (const [humans, bots] of [[2, 2], [1, 3], [4, 0], [2, 1]]) {
    const h = makeMatch({ humans, bots, fake: true });
    try {
      h.m.rngBots = () => 0;
      const ps = bots ? h.ps('ai_0') : h.ps('p_0'); ps.autoplay = true;
      assert.equal(botPickBand(h.m, ps), h.m.gd.bandIds()[0]);
    } finally { h.m.dispose(); }
  }
  const h = makeMatch({ humans: 3, bots: 1, fake: true });
  try { h.m.rngBots = () => 0; h.ps('p_0').autoplay = true; assert.equal(botPickBand(h.m, h.ps('p_0')), h.m.gd.bandIds()[0]); }
  finally { h.m.dispose(); }
});
test('unavailable TOUCH in a restricted band pool falls back to an available strategy', () => {
  const h = makeMatch({ humans: 3, bots: 1, fake: true });
  try {
    const id = h.m.gd.bandIds()[0]; h.m.gd.bandIds = () => [id];
    assert.equal(botPickBand(h.m, h.ps('ai_0')), id);
  } finally { h.m.dispose(); }
});
