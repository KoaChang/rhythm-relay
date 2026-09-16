const finite = (value) => typeof value === "number" && Number.isFinite(value);

function audioContextFactory() {
  const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!Context) throw new Error("This browser does not support Web Audio.");
  return new Context({ latencyHint: "interactive" });
}

function cancelled() {
  const error = new Error("Playback was cancelled before audio was ready.");
  error.name = "AbortError";
  return error;
}

function validate({
  events,
  bpm,
  beatsPerCycle,
  cycles = 1,
  countInBeats = beatsPerCycle,
  countInAudible = true,
  targetAudible = true,
  volume = 0.7,
  leadInSeconds = 0.08,
} = {}) {
  if (!finite(bpm) || bpm <= 0 || bpm > 400)
    throw new Error("bpm must be between 0 and 400.");
  if (!finite(beatsPerCycle) || beatsPerCycle <= 0 || beatsPerCycle > 64)
    throw new Error("beatsPerCycle must be positive and no greater than 64.");
  if (!Number.isInteger(cycles) || cycles < 1 || cycles > 32)
    throw new Error("cycles must be an integer from 1 to 32.");
  if (!Number.isInteger(countInBeats) || countInBeats < 0 || countInBeats > 32)
    throw new Error("countInBeats must be an integer from 0 to 32.");
  if (!finite(volume) || volume < 0 || volume > 1)
    throw new Error("volume must be between 0 and 1.");
  if (!finite(leadInSeconds) || leadInSeconds < 0.02 || leadInSeconds > 2)
    throw new Error("leadInSeconds must be between 0.02 and 2.");
  if (!Array.isArray(events) || events.length > 2048)
    throw new Error("events must be an array with at most 2048 entries.");
  if (typeof countInAudible !== "boolean" || typeof targetAudible !== "boolean")
    throw new Error("Audibility options must be booleans.");
  const durationBeats = beatsPerCycle * cycles;
  const normalized = events
    .map((event) => {
      if (
        !event ||
        !finite(event.beat) ||
        event.beat < 0 ||
        event.beat >= durationBeats
      ) {
        throw new Error(
          "Each event beat must fall within the requested cycles.",
        );
      }
      const voices = event.voices === undefined ? ["main"] : event.voices;
      if (
        !Array.isArray(voices) ||
        voices.length > 8 ||
        voices.some((voice) => typeof voice !== "string" || !voice)
      ) {
        throw new Error(
          "Event voices must be an array of up to eight nonempty string IDs.",
        );
      }
      return { beat: event.beat, voices: [...new Set(voices)] };
    })
    .sort((a, b) => a.beat - b.beat);
  return {
    events: normalized,
    bpm,
    durationBeats,
    countInBeats,
    countInAudible,
    targetAudible,
    volume,
    leadInSeconds,
  };
}

/**
 * Dependency-free browser percussion playback, safe to import without a DOM.
 * Call play() directly from a click/key gesture; no context exists before then.
 *
 * play({ events, bpm, beatsPerCycle, cycles, countInBeats, targetAudible,
 *        countInAudible }) accepts absolute event.beat offsets across ALL cycles.
 * A multi-voice event plays those voices together. `event.time` is ignored:
 * scheduling always uses beat offsets and the selected tempo.
 *
 * contextStartTime (seconds) and performanceStartTime (milliseconds, same origin
 * as performance.now()) refer to the target AFTER the count-in. Output-device
 * timestamps are used when available; otherwise the mapping is an estimate.
 * Browsers, Bluetooth devices and human input add timing uncertainty: the
 * returned mapping is not a claim of laboratory-grade latency calibration.
 *
 * Animate from currentTime, rather than setTimeout callbacks. runId changes on
 * play, stop, or suspension so a UI can discard a trial interrupted by the OS.
 */
export class RhythmAudio {
  constructor({
    createContext = audioContextFactory,
    performanceNow = () => globalThis.performance.now(),
  } = {}) {
    this._createContext = createContext;
    this._performanceNow = performanceNow;
    this._context = null;
    this._nodes = new Set();
    this._runId = 0;
    this._endTime = null;
    this._disposed = false;
    this.lastStopReason = null;
    this._stateChanged = () => {
      if (this._context && this._context.state !== "running")
        this._cancel(this._context.state);
    };
  }

  get currentTime() {
    return this._context?.currentTime ?? 0;
  }
  get contextState() {
    return (
      this._context?.state ?? (this._disposed ? "closed" : "uninitialized")
    );
  }
  get runId() {
    return this._runId;
  }
  get isPlaying() {
    return (
      this._endTime !== null &&
      this._context?.state === "running" &&
      this.currentTime < this._endTime
    );
  }

  _cancel(reason) {
    this._runId += 1;
    this._endTime = null;
    this.lastStopReason = reason;
    for (const note of this._nodes) {
      try {
        note.source.stop(this.currentTime);
      } catch {
        /* Already ended. */
      }
      note.source.onended = null;
      note.source.disconnect();
      note.gain.disconnect();
    }
    this._nodes.clear();
  }

  stop() {
    this._cancel("stopped");
  }

  _note(at, voice, volume) {
    const context = this._context;
    const source = context.createOscillator();
    const gain = context.createGain();
    const countIn = voice < 0;
    const low = voice === 0;
    const duration = countIn ? 0.06 : low ? 0.15 : 0.085;
    const frequency = countIn
      ? voice === -2
        ? 1150
        : 880
      : low
        ? 170
        : 700 + (voice - 1) * 130;
    source.type = low || countIn ? "sine" : "triangle";
    source.frequency.setValueAtTime(frequency, at);
    source.frequency.exponentialRampToValueAtTime(
      countIn ? frequency : low ? 48 : 320,
      at + duration,
    );
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(
      Math.max(0.0001, volume * (countIn ? 0.18 : 0.38)),
      at + 0.002,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(gain);
    gain.connect(context.destination);
    const note = { source, gain };
    this._nodes.add(note);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      this._nodes.delete(note);
    };
    source.start(at);
    source.stop(at + duration + 0.01);
  }

  _performanceMapping(context) {
    // getOutputTimestamp maps frames at the actual output device to the same
    // monotonic clock used by performance.now(). It already includes latency.
    let output;
    try {
      output = context.getOutputTimestamp?.();
    } catch {
      /* Older browser. */
    }
    const observedPerformanceTime = this._performanceNow();
    const mappedCurrentTime =
      output?.performanceTime +
      (context.currentTime - output?.contextTime) * 1000;
    // Immediately after resume a browser can still expose its pre-suspension
    // frame. Do not use that old mapping to score a newly started trial.
    const recentMapping =
      mappedCurrentTime >= observedPerformanceTime - 250 &&
      mappedCurrentTime <= observedPerformanceTime + 1000;
    if (
      output &&
      finite(output.contextTime) &&
      output.contextTime >= 0 &&
      finite(output.performanceTime) &&
      output.performanceTime > 0 &&
      recentMapping
    ) {
      return {
        offset: output.performanceTime - output.contextTime * 1000,
        source: "output-timestamp",
      };
    }
    const before = observedPerformanceTime;
    const contextTime = context.currentTime;
    const after = this._performanceNow();
    const baseLatency = finite(context.baseLatency)
      ? Math.max(0, context.baseLatency)
      : 0;
    const outputLatency = finite(context.outputLatency)
      ? Math.max(0, context.outputLatency)
      : 0;
    return {
      offset:
        (before + after) / 2 -
        contextTime * 1000 +
        (baseLatency + outputLatency) * 1000,
      source: "estimated-performance-clock",
    };
  }

  async play(options) {
    const settings = validate(options);
    if (this._disposed) throw new Error("This audio engine has been disposed.");
    this.stop();
    const runId = this._runId;
    if (!this._context || this._context.state === "closed") {
      this._context?.removeEventListener?.("statechange", this._stateChanged);
      this._context = this._createContext();
      this._context.addEventListener?.("statechange", this._stateChanged);
    }
    const context = this._context;
    if (context.state !== "running") await context.resume();
    if (runId !== this._runId || this._disposed) throw cancelled();
    if (context.state !== "running")
      throw new Error(
        "Audio is suspended. Start playback again from a button or key press.",
      );

    const beatSeconds = 60 / settings.bpm;
    const countInContextTime = context.currentTime + settings.leadInSeconds;
    const contextStartTime =
      countInContextTime + settings.countInBeats * beatSeconds;
    const endContextTime =
      contextStartTime + settings.durationBeats * beatSeconds;
    const mapping = this._performanceMapping(context);
    const voices = new Map();
    try {
      if (settings.countInAudible && settings.volume > 0) {
        for (let beat = 0; beat < settings.countInBeats; beat += 1) {
          this._note(
            countInContextTime + beat * beatSeconds,
            beat === 0 ? -2 : -1,
            settings.volume,
          );
        }
      }
      if (settings.targetAudible && settings.volume > 0) {
        for (const event of settings.events) {
          for (const voice of event.voices) {
            if (!voices.has(voice)) voices.set(voice, voices.size);
            this._note(
              contextStartTime + event.beat * beatSeconds,
              voices.get(voice),
              settings.volume / Math.max(1, event.voices.length),
            );
          }
        }
      }
    } catch (error) {
      this.stop();
      throw error;
    }
    this._endTime = endContextTime;
    this.lastStopReason = null;
    return {
      runId,
      contextStartTime,
      performanceStartTime: mapping.offset + contextStartTime * 1000,
      endContextTime,
      endPerformanceTime: mapping.offset + endContextTime * 1000,
      countInContextTime,
      countInPerformanceTime: mapping.offset + countInContextTime * 1000,
      beatSeconds,
      timingSource: mapping.source,
    };
  }

  async dispose() {
    this.stop();
    this._disposed = true;
    const context = this._context;
    this._context = null;
    context?.removeEventListener?.("statechange", this._stateChanged);
    if (context && context.state !== "closed") await context.close();
  }
}
