import { createOfflineDocument } from "@audiotool/nexus";
import {
  prepareRhythmExport,
  writeRhythmDocument,
  readRhythmDocument,
} from "../src/nexus.js";
import { input } from "./nexus-fixture.js";

// Run in a real browser after Vite production bundling. Node imports do not
// reproduce minifier changes to protobuf class names inside Nexus 0.0.17.
const result = document.getElementById("result");
let doc;
let failure;
let actual;
try {
  doc = await createOfflineDocument();
  const spec = prepareRhythmExport(input);
  const written = await writeRhythmDocument(doc, spec);
  actual = readRhythmDocument(doc, written.collectionId);
  if (actual.bpm !== spec.bpm || actual.durationTicks !== spec.durationTicks ||
      actual.notes.length !== spec.notes.length) {
    throw new Error("Production readback differs from the expected rhythm");
  }
  for (const [index, expected] of spec.notes.entries()) {
    const note = actual.notes[index];
    for (const key of ["pitch", "positionTicks", "durationTicks"])
      if (note[key] !== expected[key]) throw new Error(`Production note ${index} has incorrect ${key}`);
    if (Math.abs(note.velocity - expected.velocity) > 0.00001)
      throw new Error(`Production note ${index} has incorrect velocity`);
  }
} catch (error) {
  failure = error;
} finally {
  if (doc) {
    try { await doc.stop(); }
    catch (error) { failure ??= error; }
  }
}
const report = failure
  ? { passed: false, error: failure.message, stack: failure.stack }
  : { passed: true, notes: actual.notes.length, bpm: actual.bpm, durationTicks: actual.durationTicks };
result.textContent = JSON.stringify(report, null, 2);
result.dataset.complete = "true";
result.dataset.passed = String(report.passed);
window.productionSdkResult = report;
