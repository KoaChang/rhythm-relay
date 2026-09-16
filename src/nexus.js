import { audiotool } from "@audiotool/nexus";
import { Ticks } from "@audiotool/nexus/utils";

// Audiotool 0.0.17 uses General MIDI percussion notes for Beatbox 8.
export const DRUM_PITCHES = Object.freeze({
  kick: 36,
  snare: 38,
  hat: 42,
  clap: 39,
  cowbell: 56,
});

export async function connectAudiotool({ clientId, redirectUrl }) {
  if (typeof clientId !== "string" || !clientId.trim()) {
    throw new Error("An Audiotool OAuth client ID is required.");
  }
  const callback = new URL(redirectUrl);
  if (
    callback.protocol !== "https:" &&
    !(
      ["localhost", "127.0.0.1"].includes(callback.hostname) &&
      callback.protocol === "http:"
    )
  ) {
    throw new Error("Use HTTPS or a local development callback.");
  }
  return audiotool({
    clientId: clientId.trim(),
    redirectUrl: callback.href,
    scope: "project:write",
  });
}

/** Convert a preview into an exact, bounded export before any network mutation. */
export function prepareRhythmExport({
  title = "Rhythm Relay practice",
  bpm,
  totalBeats,
  events,
}) {
  if (typeof title !== "string" || !title.trim() || title.trim().length > 120)
    throw new Error("Give the project a title of 1–120 characters.");
  if (!Number.isFinite(bpm) || bpm < 30 || bpm > 240)
    throw new Error("Tempo must be between 30 and 240 BPM.");
  if (!Number.isFinite(totalBeats) || totalBeats <= 0 || totalBeats > 256)
    throw new Error("Practice length must be between 0 and 256 beats.");
  if (!Array.isArray(events) || !events.length || events.length > 2048)
    throw new Error("Choose a rhythm with 1–2048 events.");
  const notes = [];
  const seen = new Set();
  const durationTicks = Math.round(totalBeats * Ticks.Beat);
  for (const event of events) {
    if (
      !event ||
      !Number.isFinite(event.beat) ||
      event.beat < 0 ||
      event.beat >= totalBeats
    )
      throw new Error("Every event must fall inside the practice length.");
    if (
      !Array.isArray(event.voices) ||
      !event.voices.length ||
      event.voices.length > 5
    )
      throw new Error("Every event needs one or more supported drum voices.");
    const positionTicks = Math.round(event.beat * Ticks.Beat);
    if (positionTicks >= durationTicks)
      throw new Error("An event rounds beyond the end of the practice.");
    const velocity = event.velocity ?? (event.accent ? 0.95 : 0.72);
    if (!Number.isFinite(velocity) || velocity <= 0 || velocity > 1)
      throw new Error(
        "Note strength must be greater than 0 and no more than 1.",
      );
    for (const voice of event.voices) {
      if (!Object.hasOwn(DRUM_PITCHES, voice))
        throw new Error(`Unsupported drum voice: ${String(voice)}`);
      const pitch = DRUM_PITCHES[voice];
      const key = `${positionTicks}:${pitch}`;
      if (seen.has(key)) continue;
      seen.add(key);
      notes.push({
        positionTicks,
        durationTicks: Math.min(
          Ticks.SemiQuaver / 2,
          durationTicks - positionTicks,
        ),
        pitch,
        velocity,
      });
    }
  }
  if (notes.length > 4096)
    throw new Error("The rhythm has too many notes to export.");
  notes.sort((a, b) => a.positionTicks - b.positionTicks || a.pitch - b.pitch);
  return { title: title.trim(), bpm, totalBeats, durationTicks, notes };
}

/** This builder is only used in a newly created project (and real offline SDK tests). */
export async function writeRhythmDocument(document, spec) {
  // SDK 0.0.17 does not release its transaction lock when a modify callback
  // throws. Return any failure and rethrow AFTER it finishes, so stop can flush
  // and release the session. A failed export may leave this new project partial.
  const result = await document.modify((t) => {
    try {
      const allowedBaselineTypes = new Set([
        "config",
        "groove",
        "mixerMaster",
        "mixerChannel",
      ]);
      if (
        t.entities
          .get()
          .some((entity) => !allowedBaselineTypes.has(entity.entityType))
      ) {
        throw new Error(
          "Export requires a new empty project; existing musical content will not be changed.",
        );
      }
      let config = t.entities.ofTypes("config").getOne();
      if (!config) {
        const groove =
          t.entities.ofTypes("groove").getOne() ?? t.create("groove", {});
        config = t.create("config", { defaultGroove: groove.location });
      }
      t.update(config.fields.tempoBpm, spec.bpm);
      t.update(config.fields.signatureNumerator, 4);
      t.update(config.fields.signatureDenominator, 4);
      t.update(config.fields.durationTicks, spec.durationTicks);
      if (!t.entities.ofTypes("mixerMaster").getOne())
        t.create("mixerMaster", { positionX: 500, positionY: 100 });
      const nextStrip = t.entities
        .ofTypes("mixerChannel")
        .get()
        .reduce(
          (max, channel) =>
            Math.max(
              max,
              channel.fields.displayParameters.fields.orderAmongStrips.value +
                1,
            ),
          0,
        );
      const channel = t.create("mixerChannel", {
        displayParameters: {
          displayName: "Rhythm Relay drums",
          orderAmongStrips: nextStrip,
        },
        preGain: 0.5,
      });
      const drum = t.create("beatbox8", {
        displayName: "Rhythm Relay · Beatbox 8",
        positionX: 100,
        positionY: 100,
        gain: 0.6,
      });
      t.create("desktopAudioCable", {
        fromSocket: drum.fields.audioOutput.location,
        toSocket: channel.fields.audioInput.location,
      });
      const track = t.create("noteTrack", {
        player: drum.location,
        orderAmongTracks: 0,
      });
      const collection = t.create("noteCollection", {});
      t.create("noteRegion", {
        collection: collection.location,
        track: track.location,
        region: {
          displayName: spec.title,
          positionTicks: 0,
          durationTicks: spec.durationTicks,
          loopDurationTicks: spec.durationTicks,
        },
      });
      for (const note of spec.notes)
        t.create("note", { ...note, collection: collection.location });
      return {
        collectionId: collection.id,
        drumId: drum.id,
        trackId: track.id,
        noteCount: spec.notes.length,
      };
    } catch (error) {
      return { error };
    }
  });
  if (result.error) throw result.error;
  return result;
}

export function readRhythmDocument(document, collectionId) {
  const config = document.queryEntities.ofTypes("config").getOne();
  const notes = document.queryEntities
    .ofTypes("note")
    .get()
    .filter((note) => note.fields.collection.value.entityId === collectionId)
    .map((note) => ({
      positionTicks: note.fields.positionTicks.value,
      durationTicks: note.fields.durationTicks.value,
      pitch: note.fields.pitch.value,
      velocity: note.fields.velocity.value,
    }))
    .sort((a, b) => a.positionTicks - b.positionTicks || a.pitch - b.pitch);
  return {
    bpm: config?.fields.tempoBpm.value,
    durationTicks: config?.fields.durationTicks.value,
    notes,
  };
}

function verifyReadback(actual, spec) {
  if (
    Math.abs(actual.bpm - spec.bpm) > 0.001 ||
    actual.durationTicks !== spec.durationTicks ||
    actual.notes.length !== spec.notes.length
  )
    throw new Error("Audiotool readback did not match the exported rhythm.");
  for (let i = 0; i < spec.notes.length; i++) {
    const a = actual.notes[i],
      b = spec.notes[i];
    if (
      a.pitch !== b.pitch ||
      a.positionTicks !== b.positionTicks ||
      a.durationTicks !== b.durationTicks ||
      Math.abs(a.velocity - b.velocity) > 0.00001
    )
      throw new Error("Audiotool note readback did not match the export.");
  }
}

/** Create exactly one new working project, flush writes, and reopen to verify. */
export async function createRhythmProject(client, input) {
  const spec = prepareRhythmExport(input);
  if (client?.status !== "authenticated")
    throw new Error("Connect your Audiotool account before exporting.");
  const created = await client.projects.createProject({
    project: { displayName: spec.title },
  });
  if (created instanceof Error) throw created;
  const projectName = created.project?.name;
  if (!projectName) throw new Error("Audiotool did not return a new project.");
  let document;
  let dawUrl;
  try {
    document = await client.open(projectName);
    dawUrl = document.dawUrl;
    await document.start();
    const written = await writeRhythmDocument(document, spec);
    await document.stop(); // SDK flushes pending writes before this resolves.
    document = undefined;
    document = await client.open(projectName);
    await document.start();
    const readback = readRhythmDocument(document, written.collectionId);
    verifyReadback(readback, spec);
    await document.stop();
    document = undefined;
    return {
      projectName,
      projectUrl: dawUrl,
      dawUrl,
      title: spec.title,
      noteCount: readback.notes.length,
      notesVerified: readback.notes.length,
      bpm: readback.bpm,
      totalBeats: spec.totalBeats,
      verified: true,
    };
  } catch (cause) {
    if (document) {
      try {
        await document.stop();
      } catch {
        /* Keep the original failure. */
      }
    }
    const error = new Error(
      "A new Audiotool project was created, but its rhythm could not be verified. Inspect it before exporting again.",
      { cause },
    );
    error.projectName = projectName;
    error.dawUrl = dawUrl;
    error.projectUrl = dawUrl;
    throw error;
  }
}
