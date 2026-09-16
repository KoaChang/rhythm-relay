# Rhythm Relay demo: provenance and limitations

[Watch or download the demo](./demo.mp4).

Prepared September 16, 2026 UTC. The demo combines actual local browser recording with explicitly labeled screenshots from a separate successful hosted owner-account integration test. It is silent: no audio was captured, synthesized for the video, or added as a soundtrack. The app itself uses synthesized audio, but this file is not evidence of audible playback.

## Timeline

| Time | What is shown | Evidence type |
| --- | --- | --- |
| 00:00.000–02:00.300 | Listening, Tresillo at 90 BPM, automated taps and actual feedback, a custom five-hit/twelve-step rhythm with rotation, and Three against two | Actual recording of the local practice interface |
| 02:00.300–02:12.300 | Separate hosted test reporting a new project with 12 verified notes at 96 BPM; explanation of write-session stop, reopen, and saved-note comparison | Actual screenshot, held on screen and labeled as a screenshot |
| 02:12.300–02:20.300 | Saved Audiotool project: four-bar region, 12 C-Hat notes, piano roll, velocities, and mixer | Actual screenshot, complete overview |
| 02:20.300–02:28.300 | A closer view of the same piano-roll screenshot; owner-account and unverified-access limitations | Fixed crop of the same screenshot, with no simulated interaction or motion |
| 02:28.300–02:40.300 | App and source links, AI assistance disclosure, and remaining second-account limitation | Editorial closing card |

The practice and hosted integration sections are separate runs. The practice demonstration uses 90 BPM; the verified export shown in the screenshot uses 96 BPM. The transition does not represent one uninterrupted performance or export.

## Practice recording

The browser recording was made from the actual local app at `http://127.0.0.1:4320/` using an isolated automation session. No account sign-in or export occurred in that session, and it was closed after capture. The practice input is deliberately and prominently labeled automated. Three timed button inputs exercised the real tap handler and produced the displayed score of 70/100, with 3/3 matched hits, no misses or extras, and average 45 ms late. The score and UI feedback were not replaced or edited.

The raw capture is 1600×800 at 10 frames per second. The finished practice segment repeats those frames into a 30 fps output and adds a 100-pixel caption band; this does not add captured motion. An explicit color-range conversion corrects the recorder/decoder mismatch so the exported colors remain close to the actual interface.

## Hosted integration screenshots

The main agent supplied screenshots after testing the real hosted app and the actual saved Audiotool project through the owner's account. The app's success status followed stopping the write session, reopening the newly created project, and checking the saved notes against the intended rhythm. This underlying workflow is documented in [VERIFICATION.md](./VERIFICATION.md). A screenshot of the result does not itself record every preceding step.

The app screenshot visibly reports 12 verified notes at 96 BPM. The DAW screenshot visibly shows the saved four-bar region, 12 C-Hat notes, note velocities, and mixer. The screenshot appendix uses only fixed cropping/scaling and captions. It does not animate a playhead, fake mouse interaction, alter notes, or imply that a static frame demonstrates playback over time. A native screen recording was attempted but did not produce usable integration footage, so the video uses clearly labeled screenshots instead.

Source-file timestamps, recorded as filesystem modification times rather than independently verified capture times:

- `rhythm-export-live.png`: September 16, 2026, 06:00:34 UTC. SHA-256: `438910545a3ccbdef7f0d621672da15f138a6e78047bde7e81191e9319ec92d8`.
- `rhythm-daw-live.png`: September 16, 2026, 06:00:08 UTC. SHA-256: `8bc1323b7f22877159b5c919ae04ea926a437a1bce5a6f51cd50cc69bf6dcbff`.

The original screenshots, raw recording, capture log, caption files, and assembly scripts are retained locally in the ignored `artifacts/` directory. They are not included in the public source by this assembly step.

## Scope and disclosure

The project and demo were built with substantial OpenAI Codex assistance. The owner-account Nexus creation and saved-note readback are verified. Second-account OAuth/export, independent judge access, and audible DAW playback remain unverified. This demo does not claim human musical performance, captured sound, a completed contest submission, a sponsor's approval, or payment.

App: https://koachang.github.io/rhythm-relay/

Source: https://github.com/KoaChang/rhythm-relay

Public viewing page: https://koachang.github.io/rhythm-relay/demo.html. Direct MP4: https://koachang.github.io/rhythm-relay/demo.mp4. The repository retains the byte-identical `docs/demo.mp4` copy. Availability is verified after deployment.

## Finished-file verification

- Duration: 160.3 seconds (2:40.3), below the three-minute form limit reported during preparation.
- Picture: 1600×900, 16:9, H.264, 30 fps; burned-in captions.
- Audio streams: 0. The file is deliberately silent.
- Size: 2,304,712 bytes.
- SHA-256: `2d54ed4ad2bbe400781db0dd1f895f1269feb57d4931a6f0190f65d626fd23c4`.
- The artifact and `docs/demo.mp4` copies are byte-identical. Full-file decoding completed without errors. Representative practice, export, DAW overview/detail, and closing frames were visually inspected for legibility and accurate labels.
