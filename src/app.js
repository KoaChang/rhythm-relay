import {
  PATTERNS,
  generateEuclidean,
  patternEvents,
  matchTaps,
} from "./rhythm.js";
import { RhythmAudio } from "./audio.js";
import { connectAudiotool, createRhythmProject } from "./nexus.js";

const $ = (id) => document.getElementById(id);
const audio = new RhythmAudio();
let selected = PATTERNS[0];
let bpm = 96;
let active = null;
let frame = null;
let runId = 0;
let client = null;
let connecting = false;
let exporting = false;
let clientId = import.meta.env.VITE_AUDIOTOOL_CLIENT_ID || "";
try {
  clientId ||= localStorage.getItem("rhythm-relay-client-id") || "";
} catch {}
$("client-id").value = clientId;

const svgEl = (tag, attributes) => {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attributes))
    el.setAttribute(key, value);
  return el;
};

function renderLibrary() {
  const host = $("presets");
  host.replaceChildren();
  PATTERNS.forEach((pattern, i) => {
    const button = document.createElement("button");
    button.className = `preset${selected.id === pattern.id ? " active" : ""}`;
    button.setAttribute("aria-pressed", String(selected.id === pattern.id));
    const number = document.createElement("span");
    number.className = "preset-num";
    number.textContent = String(i + 1).padStart(2, "0");
    const words = document.createElement("span");
    const name = document.createElement("span");
    name.className = "preset-name";
    name.textContent = pattern.name;
    const detail = document.createElement("span");
    detail.className = "preset-detail";
    detail.textContent = `${pattern.hits.length} hits · ${pattern.beatsPerCycle} beats`;
    const arrow = document.createElement("span");
    arrow.className = "preset-arrow";
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");
    words.append(name, detail);
    button.append(number, words, arrow);
    button.addEventListener("click", () => selectPattern(pattern));
    host.append(button);
  });
  $("custom-preset").classList.toggle("active", selected.id === "custom");
}

function renderPattern() {
  renderLibrary();
  $("pattern-title").textContent = selected.name;
  $("pattern-description").textContent = selected.description;
  $("pattern-fraction").textContent =
    `${selected.hits.length} / ${selected.steps}`;
  $("cycle-label").textContent =
    `${selected.steps} subdivisions · ${selected.beatsPerCycle} beats`;
  const orbit = $("orbit");
  orbit.replaceChildren();
  orbit.setAttribute(
    "aria-label",
    `${selected.name}: ${selected.hits.length} hits across ${selected.steps} equal subdivisions`,
  );
  orbit.append(
    svgEl("circle", { cx: 160, cy: 160, r: 108, class: "orbit-track" }),
  );
  orbit.append(
    svgEl("circle", {
      cx: 160,
      cy: 160,
      r: 83,
      class: "orbit-track",
      opacity: 0.45,
    }),
  );
  const grid = $("steps-grid");
  grid.replaceChildren();
  grid.style.setProperty("--steps", selected.steps);
  for (let i = 0; i < selected.steps; i++) {
    const angle = (i / selected.steps) * Math.PI * 2 - Math.PI / 2;
    const hit = selected.hits.includes(i);
    const node = svgEl("circle", {
      cx: 160 + 108 * Math.cos(angle),
      cy: 160 + 108 * Math.sin(angle),
      r: hit ? 9 : 6,
      class: `orbit-node${hit ? " hit" : ""}`,
      "data-step": i,
    });
    const label = svgEl("text", {
      x: 160 + 130 * Math.cos(angle),
      y: 160 + 130 * Math.sin(angle),
      class: "orbit-label",
    });
    label.textContent = String(i + 1);
    orbit.append(node, label);
    const square = document.createElement("div");
    square.className = `step${hit ? " hit" : ""}`;
    square.dataset.step = i;
    square.textContent = String(i + 1);
    square.setAttribute(
      "aria-label",
      `Subdivision ${i + 1}: ${hit ? "hit" : "space"}`,
    );
    grid.append(square);
  }
  $("orbit-count").textContent = String(selected.hits.length);
  $("orbit-caption").textContent = `hits, with room to breathe`;
  $("custom-controls").hidden = selected.id !== "custom";
}

function selectPattern(pattern) {
  stop();
  selected = pattern;
  $("result").hidden = true;
  renderPattern();
}

function customPattern() {
  const steps = Number($("steps").value);
  $("hits").max = steps;
  $("rotation").max = steps - 1;
  const hits = Math.min(Number($("hits").value), steps);
  const rotation = Math.min(Number($("rotation").value), steps - 1);
  $("hits").value = hits;
  $("rotation").value = rotation;
  $("hits-value").textContent = hits;
  $("rotation-value").textContent = rotation;
  selectPattern({
    id: "custom",
    name: "Your own pocket",
    steps,
    hits: generateEuclidean(steps, hits, rotation),
    beatsPerCycle: 4,
    description:
      "An evenly spaced rhythm, rotated to find a new beginning. Change the hits and listen to the spaces.",
  });
}

function stop(message = "Four count-in beats before each turn.") {
  runId++;
  audio.stop();
  active = null;
  if (frame) cancelAnimationFrame(frame);
  frame = null;
  $("listen").disabled = false;
  $("practice").disabled = false;
  $("stop").disabled = true;
  $("tap").disabled = true;
  $("mode-pill").textContent = "READY WHEN YOU ARE";
  $("session-status").textContent = message;
  $("orbit-state").textContent = "THE POCKET";
  $("orbit-count").textContent = selected.hits.length;
  $("orbit-caption").textContent = "Every space counts";
  $("cue-title").textContent = "First, get it in your ears.";
  $("cue-description").textContent =
    "Listen once or twice. Notice the silence between the hits — it is part of the rhythm.";
  $("tap-count").textContent = "Your taps stay on this device.";
  document
    .querySelectorAll("[data-step].active")
    .forEach((el) => el.classList.remove("active"));
}

async function start(mode) {
  stop();
  const id = runId;
  const pattern = structuredClone(selected),
    tempo = bpm;
  const events = drumEvents(pattern, tempo, 1);
  $("result").hidden = true;
  $("listen").disabled = true;
  $("practice").disabled = true;
  $("stop").disabled = false;
  try {
    const timing = await audio.play({
      events,
      bpm: tempo,
      beatsPerCycle: pattern.beatsPerCycle,
      cycles: 1,
      countInBeats: 4,
      countInAudible: true,
      targetAudible: mode === "listen",
    });
    if (id !== runId) return;
    active = { mode, pattern, events, timing, taps: [], id };
    $("mode-pill").textContent = mode === "listen" ? "LISTENING" : "YOUR TURN";
    $("cue-title").textContent =
      mode === "listen" ? "Hear the shape." : "Your turn. Find the pocket.";
    $("cue-description").textContent =
      mode === "listen"
        ? "The four clicks count you in. The pattern plays once, then it is yours to try."
        : "After the four count-in clicks, tap the rhythm. No target sound this time — let your internal beat lead.";
    tick();
  } catch (error) {
    if (id === runId) stop(`Could not start audio: ${error.message}`);
  }
}

function tick() {
  if (!active) return;
  const { timing, mode, pattern } = active;
  if (audio.runId !== timing.runId || audio.contextState !== "running") {
    stop("Audio was interrupted. Start a fresh turn for accurate timing.");
    return;
  }
  const seconds = (performance.now() - timing.performanceStartTime) / 1000;
  const duration = pattern.beatsPerCycle * timing.beatSeconds;
  if (seconds >= duration + (mode === "practice" ? 0.2 : 0)) {
    finish();
    return;
  }
  const counting = seconds < 0;
  $("orbit-state").textContent = counting
    ? "COUNT IN"
    : mode === "listen"
      ? "LISTEN"
      : "YOUR TURN";
  $("orbit-count").textContent = counting
    ? String(Math.min(4, Math.max(1, Math.ceil(-seconds / timing.beatSeconds))))
    : String(
        Math.min(
          pattern.beatsPerCycle,
          Math.floor(seconds / timing.beatSeconds) + 1,
        ),
      );
  $("orbit-caption").textContent = counting
    ? "Get ready…"
    : mode === "listen"
      ? "Listen to the spaces"
      : "Stay with the pulse";
  $("session-status").textContent = counting
    ? "Four clicks. Then the rhythm begins."
    : mode === "listen"
      ? "Listen for the hits, feel the spaces."
      : "Tap the pad or press space.";
  $("tap").disabled =
    mode !== "practice" || seconds < -0.18 || seconds >= duration + 0.18;
  const step =
    !counting && seconds < duration
      ? Math.min(
          pattern.steps - 1,
          Math.floor((seconds / duration) * pattern.steps),
        )
      : -1;
  document
    .querySelectorAll("[data-step]")
    .forEach((el) =>
      el.classList.toggle("active", Number(el.dataset.step) === step),
    );
  frame = requestAnimationFrame(tick);
}

function tap() {
  if (!active || active.mode !== "practice" || $("tap").disabled) return;
  // Map input to scheduled output time, including device latency when reported.
  active.taps.push(
    (performance.now() - active.timing.performanceStartTime) / 1000,
  );
  $("tap-count").textContent =
    `${active.taps.length} ${active.taps.length === 1 ? "tap" : "taps"} captured`;
  $("tap").classList.add("pressed");
  setTimeout(() => $("tap").classList.remove("pressed"), 80);
}

function finish() {
  const run = active;
  stop(
    run.mode === "listen"
      ? "Got the shape? Now try it yourself."
      : "One turn done. Every try tunes your timing.",
  );
  if (run.mode !== "practice") return;
  const result = matchTaps(
    run.events.map((event) => event.time),
    run.taps,
    { windowSeconds: 0.18 },
  );
  renderResult(result, run.taps.length, run.events.length);
}

function renderResult(result, tapCount, targetCount) {
  const host = $("result");
  host.replaceChildren();
  const score = document.createElement("div");
  score.className = "result-score";
  score.textContent = `${Math.round(result.score)}`;
  const unit = document.createElement("small");
  unit.textContent = " / 100";
  score.append(unit);
  const copy = document.createElement("div"),
    title = document.createElement("h3"),
    advice = document.createElement("p"),
    detail = document.createElement("p");
  title.textContent =
    result.score >= 85
      ? "You found the pocket."
      : result.score >= 55
        ? "The shape is coming through."
        : tapCount
          ? "Slow it down. Find the spaces."
          : "Give the next turn a tap.";
  const errors = result.matches.map(
    (match) => match.errorSeconds ?? match.error ?? match.offset ?? 0,
  );
  const avg = errors.length
    ? errors.reduce((a, b) => a + b, 0) / errors.length
    : 0;
  const avgAbsolute = errors.length
    ? errors.reduce((a, b) => a + Math.abs(b), 0) / errors.length
    : 0;
  advice.textContent = !errors.length
    ? "Listen again, then tap after the four count-in clicks. Start with a slower tempo if it helps."
    : result.misses.length || result.extras.length
      ? "Listen for the number of hits and the spaces between them. Try a slower tempo, keeping each tap deliberate."
      : avgAbsolute < 0.025
        ? "Your matched hits are close to the beat. Try the same rhythm a little faster."
        : Math.abs(avg) < avgAbsolute * 0.5
          ? "Your hits land on both sides of the beat. Slow down and aim for the same spacing each time."
          : avg < 0
            ? "Your matched hits tend to arrive early. Relax into the space before each hit."
            : "Your matched hits tend to arrive late. Feel the next hit coming before you move.";
  detail.className = "result-detail";
  detail.textContent = `${result.matches.length} of ${targetCount} hits matched · ${result.misses.length} missed · ${result.extras.length} extra${errors.length ? ` · average ${Math.round(Math.abs(avg) * 1000)} ms ${avg < 0 ? "early" : "late"}` : ""}.`;
  copy.append(title, advice, detail);
  host.append(score, copy);
  host.hidden = false;
}

async function connect(login = false) {
  if (connecting) return;
  if (!clientId) {
    $("setup").open = true;
    $("client-id").focus();
    $("connection-status").textContent =
      "The Audiotool connection is still being set up. You can keep practicing here.";
    return;
  }
  connecting = true;
  $("connect").disabled = true;
  $("client-id").disabled = true;
  $("save-client").disabled = true;
  $("connection-status").textContent = "Checking the Audiotool connection…";
  try {
    const result = await connectAudiotool({
      clientId,
      redirectUrl: new URL("./", location.href).href,
    });
    if (result.status === "authenticated") {
      client = result;
      $("connect").textContent = "Audiotool connected";
      $("connect").disabled = true;
      $("export").disabled = false;
      $("disconnect").hidden = false;
      $("connection-status").textContent =
        `Connected${result.userName ? ` as ${result.userName}` : ""}. Ready to create a new rhythm project.`;
    } else if (result.error) {
      throw result.error;
    } else if (login) {
      await result.login();
    } else {
      $("connection-status").textContent =
        "Ready to connect. Sign in to Audiotool to create a rhythm project.";
    }
  } catch (error) {
    $("connection-status").textContent =
      `Connection did not complete: ${error.message}`;
  } finally {
    connecting = false;
    $("client-id").disabled = false;
    $("save-client").disabled = false;
    if (!client) $("connect").disabled = false;
  }
}

function drumEvents(pattern, tempo, cycles) {
  return patternEvents(pattern, { bpm: tempo, cycles, startTime: 0 }).map(
    (event) => ({
      ...event,
      voices: (event.voices?.length
        ? event.voices
        : [pattern.id === "backbeat" ? "snare" : "hat"]
      ).map((voice) =>
        voice === "three"
          ? "kick"
          : voice === "two"
            ? "snare"
            : ["kick", "snare", "hat"].includes(voice)
              ? voice
              : "hat",
      ),
      accent: event.step === 0,
    }),
  );
}

async function exportProject() {
  if (!client || exporting) return;
  exporting = true;
  $("export").disabled = true;
  $("disconnect").disabled = true;
  $("save-client").disabled = true;
  $("project-link").hidden = true;
  const pattern = structuredClone(selected),
    tempo = bpm;
  $("connection-status").textContent =
    "Creating a new project and checking that its rhythm was saved…";
  try {
    const result = await createRhythmProject(client, {
      title: `Rhythm Relay — ${pattern.name}`,
      bpm: tempo,
      totalBeats: pattern.beatsPerCycle * 4,
      events: drumEvents(pattern, tempo, 4),
    });
    $("connection-status").textContent =
      `Saved a new project with ${result.notesVerified} verified notes at ${tempo} BPM.`;
    const url = new URL(result.projectUrl);
    if (
      url.protocol === "https:" &&
      (url.hostname === "audiotool.com" ||
        url.hostname.endsWith(".audiotool.com"))
    ) {
      $("project-link").href = url.href;
      $("project-link").hidden = false;
    }
  } catch (error) {
    $("connection-status").textContent =
      `Export did not finish: ${error.message}. A new draft may exist in your Audiotool account; check there before retrying.`;
  } finally {
    exporting = false;
    $("export").disabled = !client;
    $("disconnect").disabled = false;
    $("save-client").disabled = false;
  }
}

$("listen").addEventListener("click", () => start("listen"));
$("practice").addEventListener("click", () => start("practice"));
$("stop").addEventListener("click", () =>
  stop("Stopped. Start again when you are ready."),
);
$("tap").addEventListener("pointerdown", (event) => {
  event.preventDefault();
  tap();
});
$("tap").addEventListener("click", (event) => {
  if (event.detail === 0) tap();
});
document.addEventListener("keydown", (event) => {
  const target = event.target instanceof Element ? event.target : document.body;
  if (
    event.code !== "Space" ||
    event.repeat ||
    /INPUT|SELECT|TEXTAREA/.test(target.tagName) ||
    target.closest('[contenteditable="true"]')
  )
    return;
  if (active?.mode === "practice") {
    event.preventDefault();
    tap();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && active)
    stop(
      "Paused when you left this tab. Start a fresh turn for accurate timing.",
    );
});
$("bpm").addEventListener("input", () => {
  stop();
  bpm = Number($("bpm").value);
  $("bpm-value").replaceChildren(document.createTextNode(`${bpm} `));
  const small = document.createElement("small");
  small.textContent = "BPM";
  $("bpm-value").append(small);
});
$("custom-preset").addEventListener("click", customPattern);
["steps", "hits", "rotation"].forEach((id) =>
  $(id).addEventListener("input", customPattern),
);
$("connect").addEventListener("click", () => connect(true));
$("export").addEventListener("click", exportProject);
$("disconnect").addEventListener("click", () => {
  if (!client || exporting || connecting) return;
  stop();
  client.logout();
});
$("save-client").addEventListener("click", () => {
  if (connecting || exporting) return;
  const proposed = $("client-id").value.trim();
  if (!proposed || proposed.length > 200 || /\s/.test(proposed)) {
    $("connection-status").textContent =
      "Enter a valid public OAuth client ID from the Audiotool app dashboard.";
    return;
  }
  clientId = proposed;
  try {
    localStorage.setItem("rhythm-relay-client-id", clientId);
  } catch {}
  if (client) {
    client.logout();
    return;
  }
  client = null;
  $("export").disabled = true;
  connect(false);
});
window.addEventListener("pagehide", () => audio.stop());
renderPattern();
if (clientId) connect(false);
