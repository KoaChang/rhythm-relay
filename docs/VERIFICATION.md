# Verification and remaining gates

September 15–16, 2026.

## Local checks completed

- `npm test`: 45 passed, 0 failed, 0 skipped. Ordinary Node test command exits normally. Real WASM checks run in a bounded child process; timeout, missing completion or any failed assertion fails the suite. A deliberately changed assertion was confirmed to fail before restoring the passing suite.
- Production build succeeds with Vite 8.3.0 and pinned Nexus 0.0.17.
- Rhythm unit checks cover every Euclidean grid from 1–16 subdivisions, rotation, 3:2 timing, input boundaries, tempo/cycle invariants and optimal one-to-one tap matching with missed/extra tap penalties.
- Audio unit checks cover precise scheduling, audible and silent modes, simultaneous voices, cancellation, suspension, output-device timestamp mapping and stale clock rejection. These use a fake audio context and do not prove speaker output.
- Real Nexus SDK WASM checks validate newly constructed entities, exact note timing and audio wiring. No fake schema stands in for the SDK. Network/session workflow checks use an explicitly isolated fake client and do not prove backend behavior.
- Export failure checks cover stage reporting, safe inspection links, credential redaction and no automatic project retries or deletion.
- A separate real Chromium production-bundle regression reproduced Nexus 0.0.17's `fieldIndex.slice()` failure during nested-field writes. Preserving constructor names in the Vite/Rolldown output fixed the same offline browser case: 10 notes, 90 BPM and 15,360 ticks, with every note field checked. This complements the unbundled Node tests. The reusable harness is in `test-support/production-sdk.html`, built with `node test-support/build-production-sdk.js` into ignored `artifacts/production-sdk/`; `--without-keep-names` reproduces the failing configuration. This harness uses no sign-in or remote project mutation.
- Desktop browser layout inspected at 1440×1080. Mobile layout inspected at 390×844 with no horizontal overflow.
- Live Chromium Web Audio context reached `running`. An observer of the actual oscillator starts recorded 4 count-in sounds plus 8 target sounds at 96 BPM, with exact 312.5 ms spacing between target eighths. Silent practice scheduled exactly 4 count-in sounds.
- A browser input smoke test alternated pointer and keyboard events for 8 scheduled taps. It produced 8/8 matched, no misses/extras, and a score of 100. This was automated test input, not a claim about a human performance. A partial-input run produced 4 matched/4 missed and appropriate slower-practice advice.
- Custom rhythm controls changed subdivisions, pulse count and rotation; the resulting 8-step/3-hit/rotation-2 pattern was `[0,2,5]`.
- With no app ID configured, Connect opens the setup explanation; export remains disabled. No authentication success is fabricated.
- Independent review corrected feedback that could mistake cancelling early/late errors for accuracy, and a connection-setting race. Root review corrected empty default voices, output-latency alignment and audio-interruption handling.
- Earlier GitHub Actions run [35056149460](https://github.com/KoaChang/rhythm-relay/actions/runs/35056149460) passed install, the then-current 37 checks, production build and Pages deployment on Node 24. Public Chrome verification confirmed the app rendered at https://koachang.github.io/rhythm-relay/ and changing the selected pattern updated the displayed rhythm.
- Added a prominent privacy disclosure and standalone policy after reviewing the separate developer agreements. The disconnect action uses the documented SDK logout method to clear this browser's session. The observed owner-account sign-in and export below do not constitute a separate live logout/revocation test.
- Release `7dc5eb6` passed the same CI checks and deployment in [run 35056692699](https://github.com/KoaChang/rhythm-relay/actions/runs/35056692699). Public Chrome verification followed the privacy link, confirmed the complete policy rendered, and returned to the practice app.

## Owner-account hosted integration observed

- The registered application, now in Published mode, uses the hosted callback and the minimum configured `user:read` / `project:write` scopes. Hosted OAuth sign-in returned successfully to Rhythm Relay with the owner's account.
- After the production-bundle fix, a new remote export completed. The app reported **12 verified notes at 96 BPM** after stopping the write session, reopening the new project and comparing the saved notes.
- In the actual Audiotool DAW, the project showed a four-bar Beatbox 8 region with 12 C-Hat notes and their velocities. Playback advanced the playhead and the channel/master meters. These are observed visual playback indicators; no captured-audio evidence or claim of audible playback is included.
- Two earlier failed exports left new drafts. They were left untouched; no automatic retry or deletion occurred. The successful export was a separate new project after the repair.

## Not yet verified

1. Audible DAW playback or a captured-audio recording.
2. OAuth and export with a second account, including judge access to the published application.
3. Acceptance of the GitHub Pages video hosting format: the FAQ permits an accessible file link, but the optional current form field names video platforms. The finished 2:40.3 silent demonstration contains actual practice recording and labeled actual integration screenshots; see [demo notes](DEMO-NOTES.md).
4. Award selection, sponsor acceptance, and payment. The entrant submitted the form, and its response-recorded confirmation was verified on September 16, 2026 UTC.

Live Nexus creation and saved-note readback are verified for the owner's account only. The contest form has been submitted by the entrant. No payment has been promised or earned.
