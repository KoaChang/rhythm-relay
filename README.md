# Rhythm Relay

Hear a rhythm, tap it back, and turn it into an editable Audiotool project.

**[Try the practice app](https://koachang.github.io/rhythm-relay/)** · [Watch the 2:40 captioned demo](https://koachang.github.io/rhythm-relay/demo.html)

**Development status:** practice is implemented, browser checked and hosted. Live Audiotool sign-in, new-project export and saved-note readback have succeeded with the app owner's account. The DAW showed the exported notes, an advancing playhead and active channel/master meters. Audible playback and access from a second account have not yet been verified. This is not yet a submitted competition entry.

## Try it locally

Requires Node.js 22.12+ (developed with Node 23.7).

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4320/`. Choose a pattern and press **Listen**. Four count-in clicks precede one cycle. Press **Try it yourself**, then tap the pad or press the space bar after the count-in. Practice plays the count-in, then leaves the target rhythm silent.

Four lessons cover straight eighths, backbeats, tresillo and three against two. Custom rhythms use evenly distributed pulses and rotation. Tempo changes stop the current turn. Leaving the tab or interrupting audio cancels the turn so an interrupted clock cannot produce a misleading score.

Each target hit matches at most one tap. Misses and extra taps reduce the score; the matching algorithm first maximizes matches within 180 ms, then minimizes timing error. This is a practice aid, not a calibrated measure of musical ability. The audio engine uses output-device timestamps when available, with an estimated latency fallback. Bluetooth and input devices can add uncertainty.

## Connect Audiotool

The hosted app has its OAuth application configured and has been tested with the owner's account. Access from another account, including a judge's account, remains unverified. To configure your own local copy or deployment:

1. Create/sign in to your free Audiotool account and register an OAuth app in the [developer dashboard](https://developer.audiotool.com/).
2. Register the exact redirect URI `http://127.0.0.1:4320/` for local development. For a hosted build, register that site's exact HTTPS root URL too.
3. Set the **public client ID** in the app's Connection setup panel. Do not commit the issued identifier to this open-source repository. Never enter a personal access token, client secret or password in that field. A deployment can supply `VITE_AUDIOTOOL_CLIENT_ID` through its private configuration, subject to the applicable Audiotool developer terms.
4. Connect through Audiotool's official OAuth flow. The SDK requests `project:write`.
5. **Create a rhythm project** creates one fresh project with four repeats of the chosen rhythm, a synthesized Beatbox 8 drum instrument, editable MIDI notes, a mixer channel and an audio connection. Existing projects are not opened for modification. The adapter stops the write session, reopens the created project and compares its note data before reporting success.

If remote export fails after creation, a partial draft may remain. The app reports the failed stage and provides an inspection link when available. It does not automatically retry or delete the project. Inspect it before retrying.

The SDK fetches its WASM validator from Audiotool's CDN. Internet access is needed for OAuth and remote export. Local practice uses browser-synthesized sounds, with no microphone, uploaded samples or paid inference. Google Fonts are optional presentation assets; system font fallbacks work if they do not load.

## Build and check

```sh
npm test
npm run build
npm run preview
```

See [verification notes](docs/VERIFICATION.md) for the 45 passing checks, production-bundle regression, owner-account integration evidence and remaining demonstration/access checks. A static build can be hosted on an HTTPS static host after configuring its callback address.

## Originality and data

This original project was substantially designed and implemented with OpenAI Codex assistance for Audiotool's Let’s Build challenge. No competitor submission or commercial recording was used. Rhythm names describe standard musical structures; the implementation and synthesized preview sounds are original.

Tap results stay in memory on your device. The app stores only the public client ID setting itself; Audiotool's SDK manages the OAuth session. Export sends the selected pattern and tempo to the connected Audiotool account. No analytics, microphone access or paid service is built in.

MIT licensed. Dependencies retain their respective licenses.
