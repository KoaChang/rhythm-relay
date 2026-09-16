// Child-only integration harness: real package, disk-loaded WASM, no credentials,
// API requests, browser, or cloud mutations. Project/session transport is stubbed;
// this proves document/schema behavior, not live backend persistence or playback.
import assert from 'node:assert/strict';
import { createOfflineDocument } from '@audiotool/nexus/node';
import { prepareRhythmExport, writeRhythmDocument, readRhythmDocument, createRhythmProject } from '../src/nexus.js';
import { input, wasmCases } from './nexus-fixture.js';

const cases = [
  async doc => {
    const spec = prepareRhythmExport(input);
    const result = await writeRhythmDocument(doc, spec);
    const actual = readRhythmDocument(doc, result.collectionId);
    assert.equal(actual.bpm, 90);
    assert.equal(actual.durationTicks, 15360);
    assert.equal(actual.notes.length, spec.notes.length);
    actual.notes.forEach((note, i) => {
      assert.equal(note.pitch, spec.notes[i].pitch);
      assert.equal(note.positionTicks, spec.notes[i].positionTicks);
      assert.equal(note.durationTicks, spec.notes[i].durationTicks);
      assert.ok(Math.abs(note.velocity - spec.notes[i].velocity) < 0.00001);
    });
    const drum = doc.queryEntities.ofTypes('beatbox8').getOne();
    const channel = doc.queryEntities.ofTypes('mixerChannel').getOne();
    const cable = doc.queryEntities.ofTypes('desktopAudioCable').getOne();
    assert.ok(cable.fields.fromSocket.value.equals(drum.fields.audioOutput.location));
    assert.ok(cable.fields.toSocket.value.equals(channel.fields.audioInput.location));
    assert.equal(doc.queryEntities.ofTypes('mixerMaster').get().length, 1);
    assert.equal(doc.queryEntities.ofTypes('noteTrack').getOne().fields.player.value.entityId, drum.id);
    assert.equal(doc.queryEntities.ofTypes('noteRegion').getOne().fields.collection.value.entityId, result.collectionId);
  },
  async doc => {
    const spec = prepareRhythmExport(input);
    const result = await writeRhythmDocument(doc, spec);
    const count = doc.queryEntities.get().length;
    const before = readRhythmDocument(doc, result.collectionId);
    await assert.rejects(writeRhythmDocument(doc, spec), /new empty project/);
    assert.equal(doc.queryEntities.get().length, count);
    assert.deepEqual(readRhythmDocument(doc, result.collectionId), before);
    // Regression: throwing directly inside SDK modify() leaves its lock held.
    // This real second transaction and the awaited stop() below would then hang,
    // and the parent watchdog would fail the whole suite instead of masking it.
    assert.equal(await doc.modify(t => t.entities.get().length), count);
  },
  async doc => {
    const calls = [];
    const client = mockClient(doc, calls);
    const result = await createRhythmProject(client, input);
    assert.equal(result.notesVerified, 10);
    assert.equal(result.verified, true);
    assert.equal(result.projectUrl, 'https://beta.audiotool.com/studio?project=test');
    assert.deepEqual(calls, ['create', 'open', 'start', 'stop', 'open', 'start', 'stop']);
  },
  async doc => {
    const calls = [];
    let starts = 0;
    const client = mockClient(doc, calls, async () => {
      if (++starts === 2) {
        await doc.modify(t => t.update(t.entities.ofTypes('config').getOne().fields.tempoBpm, 91));
      }
    });
    await assert.rejects(createRhythmProject(client, input), error => {
      assert.equal(error.projectName, 'projects/test');
      assert.match(error.cause.message, /readback did not match/);
      return true;
    });
    assert.deepEqual(calls, ['create', 'open', 'start', 'stop', 'open', 'start', 'stop']);
  },
];

function mockClient(doc, calls, onStart = async () => {}) {
  return {
    status: 'authenticated',
    projects: { async createProject(args) {
      assert.equal(args.project.displayName, input.title);
      calls.push('create');
      return { project: { name: 'projects/test' } };
    } },
    async open(name) {
      assert.equal(name, 'projects/test');
      calls.push('open');
      return {
        ...doc, dawUrl: 'https://beta.audiotool.com/studio?project=test',
        async start() { calls.push('start'); await onStart(); },
        async stop() { calls.push('stop'); },
      };
    },
  };
}

assert.ok(process.send, 'Run this harness through test/nexus.test.js.');
assert.equal(cases.length, wasmCases.length);
const results = [];
for (const [index, check] of cases.entries()) {
  let doc;
  let failure;
  try {
    console.log(`Starting SDK check: ${wasmCases[index]}`);
    // Validation defaults to true. Do not replace with validated:false.
    doc = await createOfflineDocument();
    console.log('Offline document opened');
    await check(doc);
    console.log('Assertions completed');
  } catch (error) {
    failure = error;
  } finally {
    if (doc) {
      try {
        // 0.0.17 exposes stop at runtime, although its OfflineDocument type
        // omits it. Await the actual document cleanup before reporting success.
        assert.equal(typeof doc.stop, 'function');
        await doc.stop();
        console.log('Offline document stopped');
      } catch (error) {
        failure = failure ? new AggregateError([failure, error], 'Check and cleanup failed') : error;
      }
    }
  }
  results.push({ name: wasmCases[index], passed: !failure, error: failure?.stack });
}
process.send({ type: 'completed', results });
// Parent terminates the remaining SDK Go runtime after receiving this report.
