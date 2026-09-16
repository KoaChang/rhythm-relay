import test from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, getPattern, generateEuclidean, rotatePattern, patternEvents, matchTaps } from '../src/rhythm.js';

const near = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} differs from ${expected}`);

test('fixtures distinguish eighth notes, backbeat, tresillo, and true simultaneous 3:2 voices', () => {
  assert.deepEqual(patternEvents(getPattern('straight-eighths'), { bpm: 60 }).map((event) => event.beat), [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
  assert.deepEqual(patternEvents(getPattern('backbeat'), { bpm: 60 }).map((event) => event.beat), [1, 3]);
  assert.deepEqual(getPattern('tresillo').hits, [0, 3, 6]);
  const three = patternEvents(getPattern('three-against-two'), { bpm: 60, voiceId: 'three' });
  const two = patternEvents(getPattern('three-against-two'), { bpm: 60, voiceId: 'two' });
  assert.equal(three.length, 3);
  assert.equal(two.length, 2);
  near(three[1].time, 2 / 3);
  near(three[2].time, 4 / 3);
  assert.deepEqual(two.map((event) => event.time), [0, 1]);
  const composite = patternEvents(getPattern('three-against-two'), { bpm: 60 });
  assert.equal(composite.length, 4, 'shared downbeat must not become two tapping targets');
  assert.deepEqual(composite[0].voices, ['three', 'two']);
});

test('fixture copies cannot mutate the exported definitions or another caller', () => {
  const copy = getPattern('three-against-two');
  copy.hits.push(5);
  copy.voices[0].hits.push(5);
  assert.deepEqual(getPattern('three-against-two').hits, [0, 2, 3, 4]);
  assert.equal(PATTERNS.every((pattern) => Object.isFrozen(pattern) && Object.isFrozen(pattern.hits)), true);
  assert.throws(() => getPattern('unknown'), /Unknown rhythm/);
});

test('Euclidean patterns distribute every valid hit count evenly around each 1–16 step circle', () => {
  for (let steps = 1; steps <= 16; steps += 1) {
    for (let hits = 0; hits <= steps; hits += 1) {
      const result = generateEuclidean(steps, hits);
      assert.equal(result.length, hits);
      assert.equal(new Set(result).size, hits);
      assert.ok(result.every((step) => Number.isInteger(step) && step >= 0 && step < steps));
      if (hits) {
        assert.equal(result[0], 0);
        const gaps = result.map((step, index) => (index + 1 < hits ? result[index + 1] : result[0] + steps) - step);
        assert.equal(gaps.reduce((sum, gap) => sum + gap, 0), steps);
        assert.ok(Math.max(...gaps) - Math.min(...gaps) <= 1);
      }
    }
  }
  assert.deepEqual(generateEuclidean(8, 3), [0, 3, 6]);
  assert.deepEqual(generateEuclidean(1, 0), []);
  assert.deepEqual(generateEuclidean(1, 1), [0]);
});

test('rotation supports negative and large offsets without mutating or dropping hits', () => {
  const source = [6, 0, 3];
  assert.deepEqual(rotatePattern(source, 8, 1), [1, 4, 7]);
  assert.deepEqual(rotatePattern(source, 8, -1), [2, 5, 7]);
  assert.deepEqual(source, [6, 0, 3]);
  assert.deepEqual(generateEuclidean(8, 3, 9), generateEuclidean(8, 3, 1));
  assert.deepEqual(rotatePattern(source, 8, Number.MAX_SAFE_INTEGER), rotatePattern(source, 8, 7));
  assert.deepEqual(rotatePattern(rotatePattern(source, 8, 3), 8, -3), [0, 3, 6]);
});

test('pattern event timing scales with BPM, offsets with start time, and does not double the cycle boundary', () => {
  const pattern = getPattern('tresillo');
  const slow = patternEvents(pattern, { bpm: 60, cycles: 2 });
  const fast = patternEvents(pattern, { bpm: 120, cycles: 2, startTime: 10 });
  assert.equal(slow.length, 6);
  assert.deepEqual(slow.map((event) => event.beat), [0, 1.5, 3, 4, 5.5, 7]);
  assert.deepEqual(slow.map((event) => event.cycle), [0, 0, 0, 1, 1, 1]);
  fast.forEach((event, index) => near(event.time - 10, slow[index].time / 2));
  assert.deepEqual(patternEvents({ steps: 8, hits: [], beatsPerCycle: 4 }), []);
});

test('invalid grids, voices, parameters and timestamps are rejected', () => {
  for (const steps of [0, 17, 2.5, NaN, '8']) assert.throws(() => generateEuclidean(steps, 1));
  for (const hits of [-1, 9, 2.5, NaN]) assert.throws(() => generateEuclidean(8, hits));
  assert.throws(() => generateEuclidean(8, 3, Infinity));
  assert.throws(() => rotatePattern([0, 0], 8));
  assert.throws(() => rotatePattern([8], 8));
  assert.throws(() => rotatePattern(new Array(2), 8));
  const pattern = getPattern('tresillo');
  for (const bpm of [0, -1, NaN, Infinity]) assert.throws(() => patternEvents(pattern, { bpm }));
  for (const cycles of [0, 1025, 1.5]) assert.throws(() => patternEvents(pattern, { cycles }));
  assert.throws(() => patternEvents(pattern, { startTime: NaN }));
  assert.throws(() => patternEvents(pattern, { voiceId: 'missing' }));
  assert.throws(() => patternEvents({ ...pattern, beatsPerCycle: 0 }));
  assert.throws(() => patternEvents({ ...pattern, voices: [{ id: 'bad', hits: [1] }] }));
  assert.throws(() => patternEvents({ ...pattern, voices: [{ id: 'x', hits: [0] }, { id: 'x', hits: [0] }] }));
  assert.throws(() => patternEvents(pattern, { bpm: Number.MIN_VALUE }));
  for (const windowSeconds of [0, -1, NaN, Infinity]) assert.throws(() => matchTaps([0], [0], { windowSeconds }));
  assert.throws(() => matchTaps([NaN], []));
  assert.throws(() => matchTaps([], [Infinity]));
  assert.throws(() => matchTaps(new Array(1), []));
  assert.throws(() => matchTaps('0', []));
  assert.throws(() => matchTaps(Array(2049).fill(0), []));
});

test('perfect taps score 100 with signed early and late timing represented correctly', () => {
  assert.equal(matchTaps([0, 0.5, 1], [0, 0.5, 1]).score, 100);
  const result = matchTaps([1, 2], [0.95, 2.05], { windowSeconds: 0.1 });
  assert.equal(result.matches.length, 2);
  near(result.matches[0].errorMs, -50);
  near(result.matches[1].errorMs, 50);
  near(result.meanSignedErrorMs, 0);
  near(result.meanAbsoluteErrorMs, 50);
  assert.equal(result.score, 50);
});

test('matching prioritizes the best one-to-one assignment rather than greedy closest pairs', () => {
  const result = matchTaps([0, 0.1], [0.09, 0.19], { windowSeconds: 0.1 });
  assert.equal(result.matches.length, 2);
  assert.deepEqual(result.matches.map((match) => [match.targetIndex, match.tapIndex]), [[0, 0], [1, 1]]);
  const closest = matchTaps([0, 0.2], [-0.1, 0.02, 0.19], { windowSeconds: 0.15 });
  assert.deepEqual(closest.matches.map((match) => match.tapIndex), [1, 2]);
  assert.deepEqual(closest.extras, [{ tapIndex: 0, time: -0.1 }]);
});

test('repeated taps never count twice and extras reduce otherwise perfect scores', () => {
  const result = matchTaps([1], [1, 1, 1]);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].tapIndex, 0);
  assert.equal(result.extras.length, 2);
  assert.equal(result.score, 33);
  assert.equal(result.precision, 1 / 3);
  assert.equal(result.hitRate, 1);
  assert.equal(matchTaps([1, 2], [1]).score, 50);
  assert.equal(matchTaps([1, 2], [1, 1]).score, 33);
});

test('inclusive windows classify boundary taps while keeping their timing quality low', () => {
  const boundary = matchTaps([1], [1.15], { windowSeconds: 0.15 });
  assert.equal(boundary.matches.length, 1);
  assert.equal(boundary.score, 0);
  const outside = matchTaps([1], [1.150001], { windowSeconds: 0.15 });
  assert.equal(outside.matches.length, 0);
  assert.equal(outside.misses.length, 1);
  assert.equal(outside.extras.length, 1);
});

test('empty practice and wholly unmatched taps produce finite scores and null timing averages', () => {
  for (const [targets, taps] of [[[], []], [[], [1]], [[1], []], [[1], [2]]]) {
    const result = matchTaps(targets, taps);
    assert.equal(result.score, 0);
    assert.equal(result.meanSignedErrorMs, null);
    assert.equal(result.meanAbsoluteErrorMs, null);
    assert.equal(result.misses.length, targets.length);
    assert.equal(result.extras.length, taps.length);
  }
});

test('input order and a shared clock shift do not change matching quality', () => {
  const targets = [2, 0, 1];
  const taps = [0.02, 2.04, 1.5, 0.96];
  const originalTargets = [...targets];
  const originalTaps = [...taps];
  const base = matchTaps(targets, taps);
  const shifted = matchTaps(targets.map((time) => time + 1000), taps.map((time) => time + 1000));
  assert.deepEqual(base.matches.map((match) => [match.targetIndex, match.tapIndex]), [[1, 0], [2, 3], [0, 1]]);
  assert.equal(shifted.score, base.score);
  near(shifted.meanAbsoluteErrorMs, base.meanAbsoluteErrorMs);
  assert.deepEqual(targets, originalTargets);
  assert.deepEqual(taps, originalTaps);
  const scaled = matchTaps(targets.map((time) => time * 2), taps.map((time) => time * 2), { windowSeconds: 0.3 });
  assert.equal(scaled.score, base.score);
  assert.deepEqual(scaled.matches.map((match) => [match.targetIndex, match.tapIndex]), base.matches.map((match) => [match.targetIndex, match.tapIndex]));
});

test('dynamic-programming assignment agrees with exhaustive small overlapping-window cases', () => {
  function optimum(targets, taps, window, index = 0, used = new Set()) {
    if (index === targets.length) return { count: 0, error: 0 };
    let best = optimum(targets, taps, window, index + 1, used);
    for (let tap = 0; tap < taps.length; tap += 1) {
      const error = Math.abs(targets[index] - taps[tap]);
      if (used.has(tap) || error > window + 1e-12) continue;
      used.add(tap);
      const rest = optimum(targets, taps, window, index + 1, used);
      used.delete(tap);
      const candidate = { count: rest.count + 1, error: rest.error + error };
      if (candidate.count > best.count || (candidate.count === best.count && candidate.error < best.error)) best = candidate;
    }
    return best;
  }
  const cases = [[], [0], [0, 0], [0, 0.1], [0.03, 0.12, 0.22], [0.1, 0.2, 0.3]];
  for (const targets of cases) {
    for (const taps of cases) {
      const expected = optimum(targets, taps, 0.11);
      const actual = matchTaps(targets, taps, { windowSeconds: 0.11 });
      assert.equal(actual.matches.length, expected.count);
      near(actual.matches.reduce((sum, match) => sum + Math.abs(match.errorSeconds), 0), expected.error);
      assert.equal(new Set(actual.matches.map((match) => match.tapIndex)).size, actual.matches.length);
      assert.equal(new Set(actual.matches.map((match) => match.targetIndex)).size, actual.matches.length);
    }
  }
});
