# Rhythm Relay — draft challenge entry

**Status: preparation only; not submitted.** The practice app is hosted and checked. Real Audiotool OAuth, remote export, saved-data verification and DAW playback remain unverified. Do not submit this draft with the pending fields unresolved or describe the offline SDK checks as a completed live integration.

## Project title

Rhythm Relay

## Short pitch

Hear a rhythm, tap it back, and prepare it for a real track. Rhythm Relay combines short listening lessons, silent tap-back practice and clear timing feedback, with an implemented Nexus adapter for turning the selected pattern into editable Audiotool drums. Live export verification is pending.

## Project description

Rhythm Relay helps learners connect the rhythm they hear with the spaces they play. Choose straight eighths, a backbeat, tresillo or three against two. Listen after a four-beat count-in, then tap the pattern from memory. Feedback shows matched, missed and extra taps, plus whether matched hits tend to land early or late. Each target can match only one tap, so repeated tapping cannot manufacture a perfect result.

Learners can slow the tempo or create an evenly distributed pulse pattern and rotate it to explore another groove. Practice sounds are synthesized in the browser; no microphone, recording upload or paid model is needed. Timing feedback is a practice aid, with device latency and Bluetooth limitations explained in the README.

The Audiotool adapter uses the official Nexus SDK. Its implemented flow creates a fresh project, writes four repeats of the chosen pattern as editable Beatbox 8 notes, adds a mixer channel and audio routing, then closes and reopens that project to compare the saved note data. It does not open other projects for modification. If verification fails after project creation, the app reports that a partial draft may remain and does not automatically retry or delete it.

**Current integration evidence:** the real SDK's offline WASM validator accepts the generated entities, exact note timing and routing. The authenticated remote workflow and actual DAW playback have not yet been demonstrated. Replace this status only after the live checks below succeed.

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
- **Demo video: [PENDING — public, accessible 2–5 minute demonstration, including the real Audiotool integration.]**

## Required live-integration evidence

Fill these from observed results, without including passwords, tokens or private account data:

- **OAuth application setup:** Created September 15, 2026 with the exact hosted callback and minimum user:read/project:write scopes; Development mode.
- **Hosted OAuth sign-in:** September 16, 2026 UTC: hosted revision 77554f1 successfully authorized the owner account and returned to the app. Judge access still needs verification.
- **New Audiotool project:** [PENDING — an actual export from Rhythm Relay, with a judge-accessible project link or video proof as permitted by the final form.]
- **Saved-data check:** [PENDING — selected rhythm, tempo, repeat count and note count; confirm the separate reopen/readback succeeds.]
- **DAW playback:** [PENDING — confirm the exported note region is editable and actual playback is audible in Audiotool.]
- **Final demo:** [PENDING — URL and duration; use the real flow in DEMO-PLAN.md. Label any automated demonstration taps.]

## Readiness check from existing records

| Requirement | Evidence available | Remaining action |
| --- | --- | --- |
| Hosted functional app | Public practice app and public-browser pattern selection recorded in VERIFICATION.md | Recheck the final hosted revision after integration changes |
| Source and README access | Public repository and setup instructions | Keep documentation aligned with the final app |
| Meaningful Nexus DAW read or write | Actual SDK adapter and passing offline validator checks | Verify authenticated remote export; offline validation alone does not meet this requirement |
| 2–5 minute demonstration | A 2 minute 30 second recording plan | Record and publish the finished demonstration after live verification |
| Account and app setup | Audiotool account and developer application created with user approval; hosted owner OAuth verified | Complete remote export and verify judge access |
| Profile / Discord participation | Mentioned in the existing sponsor FAQ research | Confirm and complete any applicable participation requirements |
| Final category, deadline and entry | Existing research says September 28, 2026; exact cutoff timezone is unconfirmed | Inspect the current final form, confirm cutoff and category, complete required user review and retain submission confirmation |

The recorded local suite has 37 passing tests with no failures or skips. Audio unit tests use a fake audio context; SDK session transport tests use an isolated fake client around the real offline document. Browser checks provide additional practice-interface and audio-scheduling evidence. None of those checks proves authenticated backend persistence or audible Audiotool playback.

The existing sponsor research describes six judged category prizes of $1,000 each. Entry does not guarantee payment. No contest submission, award or payment is recorded.

## Preparation sources

This draft uses only the existing `research-audiotool.md`, its referenced `research-build-challenges.md`, and this project's README, VERIFICATION.md and DEMO-PLAN.md. No new website research or submission action was performed for this draft.
