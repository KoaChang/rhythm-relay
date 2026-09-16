export const input = {
  title: 'Rhythm Relay – three against two', bpm: 90, totalBeats: 4,
  events: [
    { beat: 0, voices: ['kick', 'snare'], accent: true },
    { beat: 2 / 3, voices: ['kick'] },
    { beat: 1, voices: ['snare'] },
    { beat: 4 / 3, voices: ['kick'] },
    { beat: 2, voices: ['kick', 'snare'], accent: true },
    { beat: 8 / 3, voices: ['kick'] },
    { beat: 3, voices: ['snare'] },
    { beat: 10 / 3, voices: ['kick'] },
  ],
};

export const wasmCases = [
  'validator accepts complete drum routing and reads back every note',
  'refusing existing music preserves content and releases the transaction lock',
  'new-project flow stops, reopens, verifies and closes both sessions',
  'changed readback fails verification and closes the second session',
];
