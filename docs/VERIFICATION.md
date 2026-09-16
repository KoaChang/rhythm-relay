# Verification and remaining gates

September 15–16, 2026.

## Local checks completed

- `npm test`: 37 passed, 0 failed, 0 skipped. Ordinary Node test command exits normally. Real WASM checks run in a bounded child process; timeout, missing completion or any failed assertion fails the suite. A deliberately changed assertion was confirmed to fail before restoring the passing suite.
- Production build succeeds with Vite 8.3.0 and pinned Nexus 0.0.17.
- Rhythm unit checks cover every Euclidean grid from 1–16 subdivisions, rotation, 3:2 timing, input boundaries, tempo/cycle invariants and optimal one-to-one tap matching with missed/extra tap penalties.
- Audio unit checks cover precise scheduling, audible and silent modes, simultaneous voices, cancellation, suspension, output-device timestamp mapping and stale clock rejection. These use a fake audio context and do not prove speaker output.
- Real Nexus SDK WASM checks validate newly constructed entities, exact note timing and audio wiring. No fake schema stands in for the SDK. Network/session workflow checks use an explicitly isolated fake client and do not prove backend behavior.
- Desktop browser layout inspected at 1440×1080. Mobile layout inspected at 390×844 with no horizontal overflow.
- Live Chromium Web Audio context reached `running`. An observer of the actual oscillator starts recorded 4 count-in sounds plus 8 target sounds at 96 BPM, with exact 312.5 ms spacing between target eighths. Silent practice scheduled exactly 4 count-in sounds.
- A browser input smoke test alternated pointer and keyboard events for 8 scheduled taps. It produced 8/8 matched, no misses/extras, and a score of 100. This was automated test input, not a claim about a human performance. A partial-input run produced 4 matched/4 missed and appropriate slower-practice advice.
- Custom rhythm controls changed subdivisions, pulse count and rotation; the resulting 8-step/3-hit/rotation-2 pattern was `[0,2,5]`.
- With no app ID configured, Connect opens the setup explanation; export remains disabled. No authentication success is fabricated.
- Independent review corrected feedback that could mistake cancelling early/late errors for accuracy, and a connection-setting race. Root review corrected empty default voices, output-latency alignment and audio-interruption handling.
- GitHub Actions run [35056149460](https://github.com/KoaChang/rhythm-relay/actions/runs/35056149460) passed install, all 37 checks, production build and Pages deployment on Node 24. Public Chrome verification confirmed the app rendered at https://koachang.github.io/rhythm-relay/ and changing the selected pattern updated the displayed rhythm.
- Added a prominent privacy disclosure and standalone policy after reviewing the separate developer agreements. The disconnect action uses the documented SDK logout method to clear this browser's session; live authenticated use remains part of the pending OAuth check.
- Release `7dc5eb6` passed the same CI checks and deployment in [run 35056692699](https://github.com/KoaChang/rhythm-relay/actions/runs/35056692699). Public Chrome verification followed the privacy link, confirmed the complete policy rendered, and returned to the practice app.

## Not yet verified

1. Real Audiotool OAuth login and callback.
2. A genuinely new remote Audiotool project, saved note readback after reopen, and audible playback in the DAW.
3. Live OAuth callback configuration on the already published HTTPS site.
4. A final 2–5 minute demonstration including the real integration.
5. Contest entry and sponsor confirmation.

Do not describe this as a live Nexus integration or completed contest entry until those gates are actually checked. No payment has been promised or earned.
