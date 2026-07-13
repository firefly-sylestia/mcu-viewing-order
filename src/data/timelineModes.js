export const TIMELINE_MODES = [
  { id: 'release', label: 'Release Order', description: 'View by theatrical/streaming release order.' },
  { id: 'chronological', label: 'Chronological Story', description: 'Approximate in-universe story chronology.' },
  { id: 'loki', label: 'Character POV: Loki', description: 'Focuses Loki and TVA-centric journey.' },
  { id: 'wanda', label: 'Character POV: Wanda', description: 'Focuses Wanda Maximoff arc.' },
  { id: 'multiverse', label: 'Branching Multiverse', description: 'Highlights multiverse branches and alternate continuities.' },
];

export const TIMELINE_MODE_IDS = new Set(TIMELINE_MODES.map((m) => m.id));

export const CHARACTER_POV_TITLE_SETS = {
  loki: new Set(['Thor', 'The Avengers', 'Thor: The Dark World', 'Thor: Ragnarok', 'Avengers: Infinity War', 'Avengers: Endgame', 'Loki S1', 'Loki S2', 'What If...? S1', 'What If...? S2', 'What If...? S3', 'Deadpool & Wolverine']),
  wanda: new Set(['Avengers: Age of Ultron', 'Captain America: Civil War', 'Avengers: Infinity War', 'Avengers: Endgame', 'WandaVision S1', 'Doctor Strange: Multiverse of Madness', 'Agatha All Along S1', 'What If...? S2']),
};

export const STORY_ORDER_OVERRIDES = new Map([
  ['Captain America: The First Avenger', 1],
  ['Captain Marvel', 2],
  ['Iron Man', 3],
  ['Iron Man 2', 4],
  ['The Incredible Hulk', 5],
  ['Thor', 6],
  ['The Avengers', 7],
]);

export const MULTIVERSE_BRANCH_TAGS = {
  main: ['MCU Sacred Timeline'],
  whatif: ['What If Branch'],
  legacy: ['Legacy Universe Branch'],
};
