# Rhythm Relay — draft challenge entry

**Status: preparation only; not submitted.** The practice app is hosted and checked. Owner-account OAuth, remote export and saved-note readback have succeeded, and the DAW showed the notes and visual playback activity. Audible playback, second-account/judge access remain unverified; the finished captioned demonstration labels automated practice and actual integration screenshots. Do not submit this draft with the pending fields unresolved.

## Project title

Rhythm Relay

## Short pitch

Hear a rhythm, tap it back, and turn it into editable Audiotool drums. Rhythm Relay combines short listening lessons, silent tap-back practice and clear timing feedback with a Nexus export that has created and verified saved notes in the app owner's account.

## Project description

Rhythm Relay helps learners connect the rhythm they hear with the spaces they play. Choose straight eighths, a backbeat, tresillo or three against two. Listen after a four-beat count-in, then tap the pattern from memory. Feedback shows matched, missed and extra taps, plus whether matched hits tend to land early or late. Each target can match only one tap, so repeated tapping cannot manufacture a perfect result.

Learners can slow the tempo or create an evenly distributed pulse pattern and rotate it to explore another groove. Practice sounds are synthesized in the browser; no microphone, recording upload or paid model is needed. Timing feedback is a practice aid, with device latency and Bluetooth limitations explained in the README.

The Audiotool adapter uses the official Nexus SDK. Its implemented flow creates a fresh project, writes four repeats of the chosen pattern as editable Beatbox 8 notes, adds a mixer channel and audio routing, then closes and reopens that project to compare the saved note data. It does not open other projects for modification. If verification fails after project creation, the app reports that a partial draft may remain and does not automatically retry or delete it.

**Current integration evidence:** the real SDK's offline WASM validator accepts the generated entities, exact note timing and routing. Hosted owner-account OAuth and a new remote export succeeded, with 12 notes at 96 BPM verified after reopening the saved project. Audiotool showed a four-bar Beatbox 8 region with editable C-Hat notes and velocities, plus an advancing playhead and active channel/master meters. This visual evidence does not establish audible playback or access from another account.

## Category fit

**Music Games** is the clearest fit: the app turns rhythm listening and tap-back practice into short interactive challenges. **Composition** also fits the music-theory learning and editable rhythm-generation workflow. The current official challenge pages say judges assign categories and a project can qualify for more than one category; the older FAQ wording differs. Follow the actual final form if it asks for a preference.

Sources: https://www.audiotool.com/LetsBuild/ and https://www.audiotool.com/LetsBuild/challenges (checked September 16, 2026 UTC).

## How it was built and AI disclosure

This is an original browser application built with JavaScript, Web Audio, Vite and Audiotool Nexus 0.0.17. Deterministic rhythm generation and one-to-one tap matching provide the practice behavior; no AI inference service runs in the app. Nexus supplies the document schema, validator and account integration.

OpenAI Codex substantially assisted with the project's design, implementation, tests, interface and documentation. No competitor submission or commercial recording was used. Rhythm names describe standard musical structures; the implementation and synthesized practice sounds are original. The project is MIT licensed, with dependencies retaining their own licenses. Do not add a claim of independent human review unless that review occurs.

## Links for judges

- Hosted practice app: https://koachang.github.io/rhythm-relay/
- Source and README: https://github.com/KoaChang/rhythm-relay
- Verification details: https://github.com/KoaChang/rhythm-relay/blob/main/docs/VERIFICATION.md
- Demo: https://koachang.github.io/rhythm-relay/demo.html (2:40.3, silent); direct MP4: https://koachang.github.io/rhythm-relay/demo.mp4. The FAQ permits a file link, while the current optional form field names Loom/YouTube/Vimeo; this hosting difference is disclosed.

## Entry-form clarification

The current form lists a September 28, 2026 deadline but still asks entrants to confirm a May 28–July 6 build window. This app was built in September. The entrant reports that the organizer confirmed September entries are eligible and that the form wording was not updated. That organizer permission has not been independently verified here; the actual September build date is retained. The form writes the deadline time zone as "UMT", which is ambiguous. The entrant explicitly instructed selection of the attestation after reporting that permission; final Submit remains untouched.

## Required live-integration evidence

Fill these from observed results, without including passwords, tokens or private account data:

- **OAuth application setup:** Created September 15, 2026 with the exact hosted callback and minimum user:read/project:write scopes; Initially Development; changed to Published on September 16, 2026 UTC with the same callbacks and scopes.
- **Hosted OAuth sign-in:** September 16, 2026 UTC: hosted revision 77554f1 successfully authorized the owner account and returned to the app. Judge access still needs verification.
- **New Audiotool project:** A new project was created through the hosted app after the production-bundle repair. The two earlier failed drafts were left untouched. The demo includes actual screenshots of the result, with provenance in DEMO-NOTES.md. It does not imply access to the owner’s private draft.
- **Saved-data check:** The new export completed a separate reopen/readback and reported 12 verified notes at 96 BPM. The DAW showed four repeats in a four-bar Beatbox 8 region with 12 C-Hat notes and velocities.
- **DAW playback:** The editable region, notes, advancing playhead and active channel/master meters were observed. [PENDING — audible playback or captured-audio evidence.]
- **Final demo:** https://koachang.github.io/rhythm-relay/demo.html — 2:40.3, silent. Practice recording and the separate actual integration screenshots are labeled; automated taps are identified.

## Readiness check from existing records

| Requirement | Evidence available | Remaining action |
| --- | --- | --- |
| Hosted functional app | Public practice app and public-browser pattern selection recorded in VERIFICATION.md | Recheck the final hosted revision after integration changes |
| Source and README access | Public repository and setup instructions | Keep documentation aligned with the final app |
| Meaningful Nexus DAW read or write | Owner-account remote creation and saved-note readback succeeded; the resulting notes were inspected in the DAW | Actual screenshots included with clear labels and provenance |
| Demonstration | Finished 2:40.3 captioned video, within both published duration ranges | Current form names specific video hosts; direct file hosting follows the FAQ |
| Account and app setup | Audiotool account and developer application created with user approval; hosted owner OAuth and remote export verified | A second-account check would provide additional evidence; it is not a stated entry prerequisite |
| Profile / Discord participation | Mentioned in the existing sponsor FAQ research | Confirm and complete any applicable participation requirements |
| Final category, deadline and entry | Existing research says September 28, 2026; exact cutoff timezone is unconfirmed | Current form inspected; entrant reports organizer permission for September builds. Final prize-entry action remains user operated; retain its confirmation |

The recorded local suite has 45 passing tests with no failures or skips. Audio unit tests use a fake audio context; SDK session transport tests use an isolated fake client around the real offline document. A separate production-browser regression reproduced and verified the repair for a Nexus constructor-name minification failure. Hosted owner-account checks then established remote creation and saved-note readback. Audible Audiotool playback and access from a second account remain unverified.

The existing sponsor research describes six judged category prizes of $1,000 each. Entry does not guarantee payment. No contest submission, award or payment is recorded.

## Preparation sources

This draft uses the existing `research-audiotool.md`, its referenced `research-build-challenges.md`, this project's README, VERIFICATION.md and DEMO-PLAN.md, and the recorded owner-account hosted verification. Updating this draft did not submit a contest entry.
