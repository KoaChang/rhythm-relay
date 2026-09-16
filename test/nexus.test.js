import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { prepareRhythmExport, createRhythmProject, formatExportFailure, safeProjectUrl } from '../src/nexus.js';
import { input, wasmCases } from '../test-support/nexus-fixture.js';

test('export uses documented 3840 PPQ and preserves three-against-two timing', () => {
  const spec = prepareRhythmExport(input);
  assert.equal(spec.durationTicks, 15360);
  assert.equal(spec.notes.length, 10);
  assert.deepEqual(spec.notes.filter(n => n.pitch === 36).map(n => n.positionTicks), [0, 2560, 5120, 7680, 10240, 12800]);
  assert.deepEqual(spec.notes.filter(n => n.pitch === 38).map(n => n.positionTicks), [0, 3840, 7680, 11520]);
});

test('bounds and supported voices are checked before project creation', async () => {
  let calls = 0;
  const client = { status: 'authenticated', projects: { createProject() { calls++; } } };
  for (const patch of [
    { bpm: NaN }, { bpm: 500 }, { totalBeats: 0 }, { events: [] },
    { events: [{ beat: 4, voices: ['kick'] }] },
    { events: [{ beat: 0, voices: ['unknown'] }] },
    { events: [{ beat: 0, voices: ['hat'], velocity: 2 }] },
  ]) await assert.rejects(createRhythmProject(client, { ...input, ...patch }));
  assert.equal(calls, 0);
});

test('duplicate hits collapse without mutating the preview events', () => {
  const events = [{ beat: 0, voices: ['hat', 'hat'] }, { beat: 0, voices: ['hat'] }];
  const before = structuredClone(events);
  assert.equal(prepareRhythmExport({ ...input, events }).notes.length, 1);
  assert.deepEqual(events, before);
});

test('real SDK offline WASM integration', { timeout: 25000 }, async t => {
  // Nexus 0.0.17's Go WASM runtime has no public shutdown and remains active
  // after all document.stop() calls finish. Isolate only that runtime. A timeout,
  // crash, absent result, failed assertion or failed document cleanup FAILS this
  // test. SIGTERM is sent only after every case and its cleanup has reported.
  const { report, signal, output } = await new Promise((resolve, reject) => {
    const child = fork(new URL('../test-support/nexus-worker.js', import.meta.url), [], {
      execArgv: [], silent: true, timeout: 20000, killSignal: 'SIGKILL',
    });
    let report;
    let output = '';
    const capture = chunk => { output = (output + chunk).slice(-64000); };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    child.on('error', reject);
    child.on('message', message => {
      if (message?.type !== 'completed' || report) return;
      report = message;
      child.kill('SIGTERM');
    });
    child.on('exit', (code, signal) => {
      if (!report) reject(new Error(`SDK worker ended before completing checks (code=${code}, signal=${signal}).\n${output}`));
      else resolve({ report, signal, output });
    });
  });
  assert.equal(signal, 'SIGTERM', `SDK runtime did not stop as requested.\n${output}`);
  assert.deepEqual(report.results.map(result => result.name), wasmCases, 'Every required SDK case must run exactly once.');
  for (const result of report.results) {
    await t.test(result.name, () => {
      assert.equal(result.passed, true, result.error ?? `SDK case failed.\n${output}`);
    });
  }
});

test('a partial export keeps the created project address and never auto-retries or deletes', async () => {
  let creates = 0, stops = 0;
  const client = {
    status: 'authenticated',
    projects: { async createProject() { creates++; return { project: { name: 'projects/recover' } }; } },
    async open() { return { dawUrl: 'https://beta.audiotool.com/studio?project=recover', async start() { throw new Error('connection interrupted'); }, async stop() { stops++; } }; },
  };
  await assert.rejects(createRhythmProject(client, input), error => {
    assert.equal(error.projectName, 'projects/recover');
    assert.match(error.projectUrl, /recover/);
    assert.match(error.message, /Inspect it before exporting again/);
    assert.equal(error.exportStage, 'start');
    assert.equal(error.cause.message, 'connection interrupted');
    return true;
  });
  assert.equal(creates, 1);
  assert.equal(stops, 1);
});

test('an open failure exposes the created project link and redacts nested credentials', async () => {
  let creates = 0, opens = 0;
  const client = {
    status: 'authenticated',
    projects: { async createProject() { creates++; return { project: { name: 'projects/recover' } }; } },
    async open() {
      opens++;
      throw new Error("Couldn't open session", { cause: new Error(
        'permission denied. Bearer secret-bearer-value https://oauth.audiotool.com/callback?code=secret-url-value ' +
        'access_token="secret-access-value" code=secret-code-value state=secret-state-value',
      ) });
    },
  };
  await assert.rejects(createRhythmProject(client, input), error => {
    assert.equal(error.exportStage, 'open');
    const failure = formatExportFailure(error);
    assert.equal(failure.projectUrl, 'https://beta.audiotool.com/studio?project=recover');
    assert.match(failure.message, /opening the new project: Couldn't open session → permission denied/);
    assert.match(failure.message, /\[URL omitted\]/);
    assert.doesNotMatch(failure.message + error.cause.cause.message, /secret-|\.\./);
    assert.equal(failure.message.match(/Inspect it before exporting again/g).length, 1);
    assert.doesNotMatch(failure.message, /Unknown Audiotool/);
    return true;
  });
  assert.equal(creates, 1);
  assert.equal(opens, 1);
});

test('write, flush, reopen and verify failures identify the exact stage without retrying', async t => {
  const spec = prepareRhythmExport(input);
  for (const stage of ['write', 'flush', 'reopen', 'verify']) {
    await t.test(stage, async () => {
      let creates = 0, opens = 0, stops = 0;
      const client = {
        status: 'authenticated',
        projects: { async createProject() { creates++; return { project: { name: 'projects/stages' } }; } },
        async open() {
          const count = ++opens;
          if (stage === 'reopen' && count === 2) throw new Error('session unavailable');
          return {
            dawUrl: 'https://beta.audiotool.com/studio?project=stages',
            async start() {},
            // Wrapper-stage tests use a minimal transport/document stub. The
            // separate WASM tests exercise the actual write builder and schema.
            async modify() {
              if (stage === 'write') throw new Error('modification failed validation: unknown field');
              return { collectionId: 'notes' };
            },
            async stop() {
              stops++;
              if (stage === 'flush') throw new Error('connection closed before save');
            },
            queryEntities: { ofTypes(type) {
              if (type === 'config') return { getOne: () => ({ fields: {
                tempoBpm: { value: stage === 'verify' ? 91 : spec.bpm },
                durationTicks: { value: spec.durationTicks },
              } }) };
              return { get: () => spec.notes.map(note => ({ fields: {
                ...Object.fromEntries(Object.entries(note).map(([key, value]) => [key, { value }])),
                collection: { value: { entityId: 'notes' } },
              } })) };
            } },
          };
        },
      };
      await assert.rejects(createRhythmProject(client, input), error => {
        assert.equal(error.exportStage, stage);
        assert.equal(error.projectUrl, 'https://beta.audiotool.com/studio?project=stages');
        return true;
      });
      assert.equal(creates, 1);
      assert.equal(opens, ['reopen', 'verify'].includes(stage) ? 2 : 1);
      assert.equal(stops, stage === 'verify' ? 2 : 1);
    });
  }
});

test('failure display avoids duplicate punctuation and never invents a created draft', () => {
  const failure = formatExportFailure(new Error('Connect your Audiotool account before exporting.'));
  assert.equal(failure.message, 'Export did not finish: Connect your Audiotool account before exporting.');
  assert.equal(failure.projectUrl, undefined);
  assert.doesNotMatch(failure.message, /draft|\.\./);
});

test('project links reject unsafe destinations and strip unrelated credentials', () => {
  for (const url of ['javascript:alert(1)', 'https://audiotool.com.evil.test/studio?project=ok',
    'https://user:password@beta.audiotool.com/studio?project=ok',
    'https://accounts.audiotool.com/oauth?project=ok',
    'https://beta.audiotool.com/studio?project=../../other']) {
    assert.equal(safeProjectUrl(url), undefined);
  }
  assert.equal(safeProjectUrl('https://beta.audiotool.com/studio?project=ok&code=secret#token=secret'),
    'https://beta.audiotool.com/studio?project=ok');
});
