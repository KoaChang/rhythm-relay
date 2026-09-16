import test from 'node:test';
import assert from 'node:assert/strict';
import { RhythmAudio } from '../src/audio.js';

class Parameter {
  constructor() { this.events = []; }
  setValueAtTime(value, time) { this.events.push({ kind: 'set', value, time }); }
  linearRampToValueAtTime(value, time) { this.events.push({ kind: 'linear', value, time }); }
  exponentialRampToValueAtTime(value, time) { this.events.push({ kind: 'exponential', value, time }); }
}
class FakeContext {
  constructor({ state = 'running', currentTime = 10, timestamp } = {}) {
    this.state = state;
    this.currentTime = currentTime;
    this.timestamp = timestamp;
    this.destination = {};
    this.oscillators = [];
    this.gains = [];
    this.listeners = new Set();
    this.resumes = 0;
  }
  createOscillator() {
    const node = {
      frequency: new Parameter(), starts: [], stops: [], disconnected: false,
      connect(target) { this.target = target; },
      disconnect() { this.disconnected = true; },
      start(time) { this.starts.push(time); },
      stop(time) { this.stops.push(time); },
    };
    this.oscillators.push(node);
    return node;
  }
  createGain() {
    const node = {
      gain: new Parameter(), disconnected: false,
      connect(target) { this.target = target; },
      disconnect() { this.disconnected = true; },
    };
    this.gains.push(node);
    return node;
  }
  getOutputTimestamp() { return this.timestamp; }
  addEventListener(_, callback) { this.listeners.add(callback); }
  removeEventListener(_, callback) { this.listeners.delete(callback); }
  async resume() { this.resumes += 1; this.state = 'running'; }
  async close() { this.state = 'closed'; }
  changeState(state) { this.state = state; for (const callback of this.listeners) callback(); }
}
const base = { events: [{ beat: 0 }, { beat: 1.5 }, { beat: 3 }], bpm: 120, beatsPerCycle: 4, countInBeats: 4 };
const setup = (options) => {
  const context = new FakeContext(options);
  const engine = new RhythmAudio({ createContext: () => context, performanceNow: () => 1000 });
  return { context, engine };
};
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('creating the engine does not access browser audio or create a context', () => {
  let calls = 0;
  const engine = new RhythmAudio({ createContext: () => { calls += 1; throw new Error('not yet'); } });
  assert.equal(calls, 0);
  assert.equal(engine.currentTime, 0);
  assert.equal(engine.contextState, 'uninitialized');
  assert.equal(engine.isPlaying, false);
});

test('count-in and target onsets use the audio clock and exact beat arithmetic', async () => {
  const { context, engine } = setup();
  const result = await engine.play(base);
  const starts = context.oscillators.map(node => node.starts[0]);
  assert.equal(starts.length, 7);
  [10.08, 10.58, 11.08, 11.58, 12.08, 12.83, 13.58].forEach((expected, index) => closeTo(starts[index], expected));
  closeTo(result.contextStartTime, 12.08);
  closeTo(result.performanceStartTime, 3080);
  closeTo(result.endContextTime, 14.08);
  closeTo(result.endPerformanceTime, 5080);
  assert.equal(result.beatSeconds, 0.5);
  assert.equal(result.timingSource, 'estimated-performance-clock');
  assert.equal(engine.isPlaying, true);
  context.currentTime = result.endContextTime;
  assert.equal(engine.isPlaying, false);
});

test('output timestamp mapping uses rendered-frame timing without adding latency twice', async () => {
  const { context, engine } = setup({ timestamp: { contextTime: 9.95, performanceTime: 990 } });
  context.baseLatency = 0.02;
  context.outputLatency = 0.03;
  const result = await engine.play(base);
  closeTo(result.performanceStartTime, 990 + (12.08 - 9.95) * 1000);
  assert.equal(result.timingSource, 'output-timestamp');
});

test('an uninitialized zero output timestamp falls back to estimated clock and reported latencies', async () => {
  const { context, engine } = setup({ timestamp: { contextTime: 0, performanceTime: 0 } });
  context.baseLatency = 0.02;
  context.outputLatency = 0.03;
  const result = await engine.play(base);
  closeTo(result.performanceStartTime, 3130);
  assert.equal(result.timingSource, 'estimated-performance-clock');
});

test('a pre-suspension output timestamp cannot anchor a resumed trial in the past', async () => {
  const context = new FakeContext({ state: 'suspended', timestamp: { contextTime: 10, performanceTime: 1000 } });
  const engine = new RhythmAudio({ createContext: () => context, performanceNow: () => 31000 });
  const result = await engine.play(base);
  assert.equal(result.timingSource, 'estimated-performance-clock');
  closeTo(result.performanceStartTime, 33080);
});

test('silent practice retains count-in and identical scoring anchors without target notes', async () => {
  const { context, engine } = setup();
  const result = await engine.play({ ...base, targetAudible: false });
  assert.equal(context.oscillators.length, 4);
  closeTo(result.contextStartTime, 12.08);
  closeTo(result.endContextTime, 14.08);
  assert.equal(engine.isPlaying, true);
});

test('visual-only count-in and entirely silent trials still preserve duration', async () => {
  const { context, engine } = setup();
  const result = await engine.play({ ...base, targetAudible: false, countInAudible: false });
  assert.equal(context.oscillators.length, 0);
  closeTo(result.endContextTime - result.countInContextTime, 4);
});

test('absolute beats across cycles are not repeated, and simultaneous voices share onset', async () => {
  const { context, engine } = setup();
  const events = [{ beat: 0, voices: ['three', 'two'] }, { beat: 2 / 3, voices: ['three'] }, { beat: 2, voices: ['two'] }];
  const copy = structuredClone(events);
  const result = await engine.play({ events, bpm: 60, beatsPerCycle: 2, cycles: 2, countInBeats: 0 });
  assert.equal(context.oscillators.length, 4);
  closeTo(context.oscillators[0].starts[0], context.oscillators[1].starts[0]);
  assert.notEqual(context.oscillators[0].frequency.events[0].value, context.oscillators[1].frequency.events[0].value);
  closeTo(context.oscillators[3].starts[0], result.contextStartTime + 2);
  closeTo(result.endContextTime - result.contextStartTime, 4);
  assert.deepEqual(events, copy);
});

test('stop cancels and disconnects every queued note, invalidating the trial', async () => {
  const { context, engine } = setup();
  const result = await engine.play(base);
  engine.stop();
  assert.equal(engine.isPlaying, false);
  assert.notEqual(engine.runId, result.runId);
  for (const node of context.oscillators) {
    assert.equal(node.stops.at(-1), context.currentTime);
    assert.equal(node.disconnected, true);
    assert.equal(node.onended, null);
  }
  assert.ok(context.gains.every(node => node.disconnected));
  assert.doesNotThrow(() => engine.stop());
});

test('starting again cancels earlier notes and reuses the same context', async () => {
  let created = 0;
  const context = new FakeContext();
  const engine = new RhythmAudio({ createContext: () => { created += 1; return context; }, performanceNow: () => 1000 });
  await engine.play(base);
  const original = [...context.oscillators];
  context.currentTime += 1;
  const next = await engine.play(base);
  assert.equal(created, 1);
  assert.ok(original.every(node => node.disconnected));
  closeTo(next.contextStartTime, 13.08);
});

test('stop during async resume prevents late scheduling', async () => {
  const { context, engine } = setup({ state: 'suspended' });
  let finishResume;
  context.resume = () => new Promise(resolve => { finishResume = () => { context.state = 'running'; resolve(); }; });
  const pending = engine.play(base);
  engine.stop();
  finishResume();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(context.oscillators.length, 0);
  assert.equal(engine.isPlaying, false);
});

test('overlapping play calls only schedule the latest request after resume', async () => {
  const { context, engine } = setup({ state: 'suspended' });
  const resumes = [];
  context.resume = () => new Promise(resolve => resumes.push(() => { context.state = 'running'; resolve(); }));
  const first = engine.play(base);
  const second = engine.play({ ...base, countInBeats: 0 });
  resumes[0]();
  resumes[1]();
  await assert.rejects(first, { name: 'AbortError' });
  const result = await second;
  assert.equal(context.oscillators.length, 3);
  closeTo(result.contextStartTime, 10.08);
});

test('OS suspension invalidates the scoring clock and cancels pending audio', async () => {
  const { context, engine } = setup();
  const result = await engine.play(base);
  context.changeState('suspended');
  assert.equal(engine.isPlaying, false);
  assert.equal(engine.lastStopReason, 'suspended');
  assert.notEqual(engine.runId, result.runId);
  assert.ok(context.oscillators.every(node => node.disconnected));
  await engine.play(base);
  assert.equal(context.resumes, 1);
  assert.equal(engine.isPlaying, true);
});

test('invalid input fails before creating audio or replacing a playing trial', async () => {
  const { engine, context } = setup();
  await assert.rejects(engine.play({ ...base, bpm: 0 }), /bpm/);
  assert.equal(engine.contextState, 'uninitialized');
  const running = await engine.play(base);
  await assert.rejects(engine.play({ ...base, events: [{ beat: 4 }] }), /within/);
  assert.equal(engine.runId, running.runId);
  assert.equal(context.oscillators.length, 7);
});

test('dispose cancels, closes, removes listeners, and disallows reuse', async () => {
  const { context, engine } = setup();
  await engine.play(base);
  await engine.dispose();
  assert.equal(context.state, 'closed');
  assert.equal(context.listeners.size, 0);
  assert.equal(engine.contextState, 'closed');
  await assert.rejects(engine.play(base), /disposed/);
});
