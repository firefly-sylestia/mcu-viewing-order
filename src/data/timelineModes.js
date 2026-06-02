export const TIMELINE_MODES = [
  { id: 'release', label: 'Release Order', description: 'View by theatrical/streaming release order.' },
  { id: 'chronological', label: 'Chronological Story', description: 'Approximate in-universe story chronology.' },
  { id: 'sony', label: 'Sony Marvel Universe', description: 'Shows Sony-distributed Marvel projects (Spider-Man legacy, SSU, Spider-Verse, and adjacent animation).' },
  { id: 'loki', label: 'Character POV: Loki', description: 'Focuses Loki and TVA-centric journey.' },
  { id: 'wanda', label: 'Character POV: Wanda', description: 'Focuses Wanda Maximoff arc.' },
  { id: 'multiverse', label: 'Branching Multiverse', description: 'Highlights multiverse branches and alternate continuities.' },
];

export const TIMELINE_MODE_IDS = new Set(TIMELINE_MODES.map((m) => m.id));

export const CHARACTER_POV_TITLE_SETS = {
  loki: new Set(['Thor', 'The Avengers', 'Thor: The Dark World', 'Thor: Ragnarok', 'Avengers: Infinity War', 'Avengers: Endgame', 'Loki S1', 'Loki S2', 'What If...? S1', 'What If...? S2', 'What If...? S3', 'Deadpool & Wolverine']),
  wanda: new Set(['Avengers: Age of Ultron', 'Captain America: Civil War', 'Avengers: Infinity War', 'Avengers: Endgame', 'WandaVision S1', 'Doctor Strange: Multiverse of Madness', 'Agatha All Along S1', 'What If...? S2']),
};

export const SONY_MARVEL_TITLE_SET = new Set([
  'Spider-Man',
  'Spider-Man 2',
  'Spider-Man 3',
  'The Amazing Spider-Man',
  'The Amazing Spider-Man 2',
  'Spider-Man: Homecoming',
  'Spider-Man: Far From Home',
  'Spider-Man: No Way Home',
  'Spider-Man Noir',
  'Venom',
  'Venom: Let There Be Carnage',
  'Venom: The Last Dance',
  'Morbius',
  'Madame Web',
  'Kraven the Hunter',
  'Spider-Man: Into the Spider-Verse',
  'Spider-Man: Across the Spider-Verse',
  'Spider-Man: Beyond the Spider-Verse (TBA)',
  'Spider-Man (2017) S1–S3',
  "Marvel's Spider-Man: Maximum Venom",
]);

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
