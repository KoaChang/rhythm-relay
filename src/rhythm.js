/**
 * Dependency-free rhythm and practice primitives. All times are seconds.
 *
 * PATTERNS: frozen fixtures with id, name, steps, hits, beatsPerCycle,
 *   description, and optional voices ({ id, name, hits }). Hits are zero-based.
 * getPattern(id): return a mutable copy of a fixture; unknown ids throw.
 * generateEuclidean(steps, hits, rotation = 0): sorted hit indices for 1–16
 *   steps and 0–steps hits. Positive rotation moves hits later, wrapping around.
 * rotatePattern(hits, steps, rotation = 0): rotate a unique set of hit indices.
 * patternEvents(pattern, { bpm = 120, cycles = 1, startTime = 0, voiceId } = {}):
 *   return { step, cycle, beat, time, voices } events. Beat is relative to the
 *   first cycle; time includes startTime. Shared voice onsets form one event.
 *   cycles must be an integer from 1 to 1024. No input is mutated.
 * matchTaps(targetTimes, tapTimes, { windowSeconds = 0.15 } = {}): maximize
 *   one-to-one matches inside inclusive windows, then minimize absolute error.
 *   Return matches, misses, extras, score (0–100), hitRate, precision,
 *   meanSignedErrorMs and meanAbsoluteErrorMs. Negative error means early.
 *   Each list may contain at most 2048 finite timestamps, in any order.
 *   Score = rounded 100 × sum(1 − |error| / window) / (targets + extras).
 *   Misses contribute zero; extras enlarge the denominator. Empty practice
 *   scores zero. This is a rhythm-practice measure, not a skill assessment.
 */

const MAX_STEPS = 16;
const MAX_SAMPLES = 2048;
const EPSILON = 1e-12;

function integer(value, name, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(
      `${name} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  return value;
}

function finite(value, name, positive = false) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (positive && value <= 0)
  ) {
    throw new RangeError(
      `${name} must be a ${positive ? "positive " : ""}finite number.`,
    );
  }
  return value;
}

function validateHits(hits, steps) {
  if (!Array.isArray(hits)) throw new TypeError("hits must be an array.");
  const result = Array.from(hits, (hit) =>
    integer(hit, "Each hit", 0, steps - 1),
  );
  if (new Set(result).size !== result.length)
    throw new RangeError("Hit indices must be unique.");
  return result.sort((a, b) => a - b);
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function freezeDeep(value) {
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) freezeDeep(item);
    Object.freeze(value);
  }
  return value;
}

export const PATTERNS = freezeDeep([
  {
    id: "straight-eighths",
    name: "Straight eighths",
    steps: 8,
    hits: [0, 1, 2, 3, 4, 5, 6, 7],
    beatsPerCycle: 4,
    description:
      "Eight evenly spaced pulses across four beats: two pulses per beat.",
  },
  {
    id: "backbeat",
    name: "Backbeat",
    steps: 8,
    hits: [2, 6],
    beatsPerCycle: 4,
    description: "Accents on beats two and four of a four-beat cycle.",
  },
  {
    id: "tresillo",
    name: "Tresillo · 3 + 3 + 2",
    steps: 8,
    hits: [0, 3, 6],
    beatsPerCycle: 4,
    description:
      "Three onsets separated by three, three, and two eighth-note subdivisions.",
  },
  {
    id: "three-against-two",
    name: "Three against two",
    steps: 6,
    hits: [0, 2, 3, 4],
    beatsPerCycle: 2,
    description:
      "Three equal pulses against two equal pulses over the same two-beat cycle. Both voices share the first onset.",
    voices: [
      { id: "three", name: "Three pulses", hits: [0, 2, 4] },
      { id: "two", name: "Two pulses", hits: [0, 3] },
    ],
  },
]);

export function getPattern(id) {
  const pattern = PATTERNS.find((item) => item.id === id);
  if (!pattern) throw new RangeError(`Unknown rhythm pattern: ${String(id)}.`);
  return structuredClone(pattern);
}

export function rotatePattern(hits, steps, rotation = 0) {
  integer(steps, "steps", 1, MAX_STEPS);
  integer(
    rotation,
    "rotation",
    Number.MIN_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
  );
  // Reduce before adding so large safe integer rotations stay exact.
  const offset = modulo(rotation, steps);
  return validateHits(hits, steps)
    .map((hit) => (hit + offset) % steps)
    .sort((a, b) => a - b);
}

export function generateEuclidean(steps, hits, rotation = 0) {
  integer(steps, "steps", 1, MAX_STEPS);
  integer(hits, "hits", 0, steps);
  // A mechanical word places each hit at the next crossed division boundary.
  // It starts on step zero and keeps circular gaps within one subdivision.
  const positions = [];
  for (let step = 0; step < steps; step += 1) {
    if (
      Math.floor((step * hits) / steps) !==
      Math.floor(((step - 1) * hits) / steps)
    ) {
      positions.push(step);
    }
  }
  return rotatePattern(positions, steps, rotation);
}

function validatePattern(pattern) {
  if (!pattern || typeof pattern !== "object" || Array.isArray(pattern)) {
    throw new TypeError("pattern must be an object.");
  }
  const steps = integer(pattern.steps, "steps", 1, MAX_STEPS);
  const hits = validateHits(pattern.hits, steps);
  const beatsPerCycle = finite(pattern.beatsPerCycle, "beatsPerCycle", true);
  if (pattern.voices !== undefined && !Array.isArray(pattern.voices)) {
    throw new TypeError("voices must be an array.");
  }
  const voices = (pattern.voices || []).map((voice) => {
    if (!voice || typeof voice.id !== "string" || !voice.id.trim()) {
      throw new TypeError("Each voice needs a nonempty string id.");
    }
    const voiceHits = validateHits(voice.hits, steps);
    if (voiceHits.some((hit) => !hits.includes(hit))) {
      throw new RangeError(
        "Each voice hit must also appear in the pattern hits.",
      );
    }
    return { id: voice.id, hits: voiceHits };
  });
  if (new Set(voices.map((voice) => voice.id)).size !== voices.length) {
    throw new RangeError("Voice ids must be unique.");
  }
  return { steps, hits, beatsPerCycle, voices };
}

export function patternEvents(
  pattern,
  { bpm = 120, cycles = 1, startTime = 0, voiceId } = {},
) {
  const validated = validatePattern(pattern);
  finite(bpm, "bpm", true);
  integer(cycles, "cycles", 1, 1024);
  finite(startTime, "startTime");
  let hits = validated.hits;
  if (voiceId !== undefined) {
    const voice = validated.voices.find((item) => item.id === voiceId);
    if (!voice)
      throw new RangeError(`Unknown rhythm voice: ${String(voiceId)}.`);
    hits = voice.hits;
  }
  const secondsPerBeat = 60 / bpm;
  const result = [];
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    for (const step of hits) {
      const beat = (cycle + step / validated.steps) * validated.beatsPerCycle;
      const time = startTime + beat * secondsPerBeat;
      if (!Number.isFinite(time))
        throw new RangeError(
          "Requested event times exceed the finite number range.",
        );
      result.push({
        step,
        cycle,
        beat,
        time,
        voices: validated.voices
          .filter((voice) => voice.hits.includes(step))
          .map((voice) => voice.id),
      });
    }
  }
  return result;
}

function timestamps(values, name) {
  if (!Array.isArray(values))
    throw new TypeError(`${name} must be an array of timestamps.`);
  if (values.length > MAX_SAMPLES)
    throw new RangeError(`${name} supports at most ${MAX_SAMPLES} timestamps.`);
  return Array.from(values, (time, index) => ({
    time: finite(time, `${name}[${index}]`),
    index,
  })).sort((a, b) => a.time - b.time || a.index - b.index);
}

export function matchTaps(
  targetTimes,
  tapTimes,
  { windowSeconds = 0.15 } = {},
) {
  finite(windowSeconds, "windowSeconds", true);
  const targets = timestamps(targetTimes, "targetTimes");
  const taps = timestamps(tapTimes, "tapTimes");
  const width = taps.length + 1;
  const choices = new Uint8Array((targets.length + 1) * width);
  let previousCounts = new Uint16Array(width);
  let previousErrors = new Float64Array(width);
  for (let tap = 1; tap < width; tap += 1) choices[tap] = 2;

  // For ordered times and equal windows, an optimal assignment can be chosen
  // without crossing pairs. Dynamic programming avoids greedy nearest-tap
  // decisions that can steal the only usable tap from a neighboring target.
  for (let target = 1; target <= targets.length; target += 1) {
    const counts = new Uint16Array(width);
    const errors = new Float64Array(width);
    choices[target * width] = 1;
    for (let tap = 1; tap <= taps.length; tap += 1) {
      let count = previousCounts[tap];
      let error = previousErrors[tap];
      let choice = 1; // Leave this target unmatched.
      if (
        counts[tap - 1] > count ||
        (counts[tap - 1] === count && errors[tap - 1] <= error)
      ) {
        count = counts[tap - 1];
        error = errors[tap - 1];
        choice = 2; // On equal quality, keep an earlier tap's existing match.
      }
      const distance = Math.abs(taps[tap - 1].time - targets[target - 1].time);
      const pairedCount = previousCounts[tap - 1] + 1;
      const pairedError = previousErrors[tap - 1] + distance;
      if (
        distance <= windowSeconds + EPSILON &&
        (pairedCount > count ||
          (pairedCount === count && pairedError < error - EPSILON))
      ) {
        count = pairedCount;
        error = pairedError;
        choice = 3;
      }
      counts[tap] = count;
      errors[tap] = error;
      choices[target * width + tap] = choice;
    }
    previousCounts = counts;
    previousErrors = errors;
  }

  const matches = [];
  const misses = [];
  const extras = [];
  let target = targets.length;
  let tap = taps.length;
  while (target > 0 || tap > 0) {
    const choice = choices[target * width + tap];
    if (choice === 3) {
      const targetEvent = targets[--target];
      const tapEvent = taps[--tap];
      const errorSeconds = tapEvent.time - targetEvent.time;
      matches.push({
        targetIndex: targetEvent.index,
        tapIndex: tapEvent.index,
        targetTime: targetEvent.time,
        tapTime: tapEvent.time,
        errorSeconds,
        errorMs: errorSeconds * 1000,
        accuracy: Math.max(0, 1 - Math.abs(errorSeconds) / windowSeconds),
      });
    } else if (choice === 1) {
      const event = targets[--target];
      misses.push({ targetIndex: event.index, time: event.time });
    } else {
      const event = taps[--tap];
      extras.push({ tapIndex: event.index, time: event.time });
    }
  }
  matches.reverse();
  misses.reverse();
  extras.reverse();
  const denominator = targets.length + extras.length;
  const quality = matches.reduce((total, match) => total + match.accuracy, 0);
  return {
    matches,
    misses,
    extras,
    score: denominator ? Math.round((100 * quality) / denominator) : 0,
    hitRate: targets.length ? matches.length / targets.length : 0,
    precision: taps.length ? matches.length / taps.length : 0,
    meanSignedErrorMs: matches.length
      ? matches.reduce((sum, match) => sum + match.errorMs, 0) / matches.length
      : null,
    meanAbsoluteErrorMs: matches.length
      ? matches.reduce((sum, match) => sum + Math.abs(match.errorMs), 0) /
        matches.length
      : null,
  };
}
