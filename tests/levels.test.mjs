import test from 'node:test';
import assert from 'node:assert/strict';
import { runAutoBattle } from '../src/gameLogic.js';

test('auto battle can clear all stages', () => {
  const result = runAutoBattle(4);
  assert.equal(result.state, 'won');
  assert.ok(result.score >= 5000);
  assert.ok(result.ticks < 30000);
});
