export const TIMELINE_MODES = [
  { id: 'release', label: 'Release Order', description: 'The original theatrical, streaming, and television release sequence.' },
];

export const TIMELINE_MODE_IDS = new Set(TIMELINE_MODES.map((m) => m.id));

// Stable title keys keep ordering and guidance intact when display metadata changes.
export const STORY_ORDER_OVERRIDES = new Map([
  ['Captain America: The First Avenger', 10], ['Agent Carter (One-Shot)', 11], ['Agent Carter S1', 12], ['Agent Carter S2', 13],
  ['Captain Marvel', 20], ['Iron Man', 30], ['Iron Man 2', 40], ['The Incredible Hulk', 45],
  ['A Funny Thing Happened on the Way to Thor\'s Hammer', 50], ['Thor', 60], ['The Consultant', 70], ['The Avengers', 80], ['Item 47', 90],
  ['Iron Man 3', 100], ['Thor: The Dark World', 110], ['Guardians of the Galaxy', 120], ['Guardians of the Galaxy Vol. 2', 130],
  ['Avengers: Age of Ultron', 140], ['Ant-Man', 150], ['Captain America: Civil War', 160], ['Black Widow', 170], ['Black Panther', 180],
  ['Spider-Man: Homecoming', 190], ['Doctor Strange', 200], ['Thor: Ragnarok', 210], ['Ant-Man & the Wasp', 220], ['Avengers: Infinity War', 230], ['Avengers: Endgame', 240],
  ['Loki S1', 250], ['WandaVision S1', 260], ['The Falcon & the Winter Soldier S1', 270], ['Spider-Man: Far From Home', 280], ['Spider-Man: No Way Home', 290],
  ['Doctor Strange: Multiverse of Madness', 300], ['Hawkeye S1', 310], ['Moon Knight S1', 320], ['Black Panther: Wakanda Forever', 330], ['Echo S1', 340],
  ['Ms. Marvel S1', 350], ['Thor: Love and Thunder', 360], ['Werewolf by Night', 370], ['Guardians Holiday Special', 380], ['Ant-Man & the Wasp: Quantumania', 390],
  ['Guardians of the Galaxy Vol. 3', 400], ['Loki S2', 410], ['The Marvels', 420], ['Deadpool & Wolverine', 430], ['Agatha All Along S1', 440],
  ['Daredevil: Born Again S1', 450], ['Captain America: Brave New World', 460], ['Thunderbolts*', 470], ['Fantastic Four: First Steps', 480], ['Avengers: Doomsday', 490], ['Avengers: Secret Wars', 500],
]);

export const DOOMSDAY_SECRET_WARS_TITLES = new Set([
  'Captain America: The First Avenger', 'Iron Man', 'The Avengers', 'Captain America: The Winter Soldier', 'Guardians of the Galaxy',
  'Avengers: Age of Ultron', 'Captain America: Civil War', 'Doctor Strange', 'Thor: Ragnarok', 'Avengers: Infinity War', 'Avengers: Endgame',
  'Loki S1', 'WandaVision S1', 'Spider-Man: No Way Home', 'Doctor Strange: Multiverse of Madness', 'Loki S2', 'Deadpool & Wolverine',
  'The Marvels', 'Fantastic Four: First Steps', 'Captain America: Brave New World', 'Thunderbolts*', 'Avengers: Doomsday', 'Avengers: Secret Wars',
]);

// Title-specific notes intentionally call out major prerequisite and post-credit spoilers.
// Sources consulted: Marvel.com release guides, Disney+ MCU timeline, and Marvel Studios
// post-credit scene coverage (accessed 2026-09-01). Keep this map concise and actionable.
export const SPOILER_GUIDANCE = {
  'Captain Marvel': { label: 'Post-credit spoiler', note: 'Skip the end credits until after Avengers: Infinity War.', watchAfter: 'Avengers: Infinity War' },
  'Black Widow': { label: 'Post-credit spoiler', note: 'Skip the end credits until after Hawkeye S1.', watchAfter: 'Hawkeye S1' },
  'The Consultant': { label: 'Placement note', note: 'Best after The Incredible Hulk and before The Avengers.', watchAfter: 'The Incredible Hulk' },
  'Peter’s To-Do List': { label: 'Short placement', note: 'Watch after Spider-Man: Homecoming; it is a Homecoming short.', watchAfter: 'Spider-Man: Homecoming' },
  'Avengers: Endgame': { label: 'Saga spoiler', note: 'Watch Avengers: Infinity War immediately before this; it resolves the Snap cliffhanger.', watchAfter: 'Avengers: Infinity War' },
  'Avengers: Secret Wars': { label: 'Finale prerequisite', note: 'Watch Avengers: Doomsday first.', watchAfter: 'Avengers: Doomsday' },
  'Avengers: Infinity War': { label: 'Saga prerequisite', note: 'Watch the earlier Avengers films and Guardians Vol. 1–2 first; this begins the two-part Thanos finale.', watchAfter: 'Avengers: Age of Ultron' },
  'Spider-Man: Far From Home': { label: 'Endgame aftermath', note: 'Watch Avengers: Endgame first. The story opens after its world-changing ending.', watchAfter: 'Avengers: Endgame' },
  'Spider-Man: No Way Home': { label: 'Multiverse prerequisite', note: 'Watch Far From Home first. For the full reveal, the earlier live-action Spider-Man films are strongly recommended.', watchAfter: 'Spider-Man: Far From Home' },
  'Doctor Strange: Multiverse of Madness': { label: 'Story prerequisite', note: 'Watch WandaVision and Spider-Man: No Way Home first; both directly set up its multiverse and Wanda arcs.', watchAfter: 'WandaVision S1' },
  'Thor: Love and Thunder': { label: 'Story prerequisite', note: 'Watch Thor: Ragnarok, Avengers: Infinity War, and Avengers: Endgame first.', watchAfter: 'Avengers: Endgame' },
  'Guardians of the Galaxy Vol. 3': { label: 'Emotional prerequisite', note: 'Watch Guardians Vol. 1–2, Infinity War, Endgame, the Holiday Special, and Thor: Love and Thunder first.', watchAfter: 'Guardians Holiday Special' },
  'The Marvels': { label: 'Character prerequisite', note: 'Watch Captain Marvel, WandaVision, and Ms. Marvel first; Monica, Carol, and Kamala’s arcs converge here.', watchAfter: 'Ms. Marvel S1' },
  'Hawkeye S1': { label: 'Character spoiler', note: 'Watch Avengers: Endgame and Black Widow first; Yelena’s story continues after Black Widow’s end credits.', watchAfter: 'Black Widow' },
  'Ant-Man & the Wasp: Quantumania': { label: 'Multiverse prerequisite', note: 'Watch Ant-Man, Ant-Man & the Wasp, Avengers: Endgame, and Loki S1 first.', watchAfter: 'Loki S1' },
  'Deadpool & Wolverine': { label: 'Legacy prerequisite', note: 'The biggest reveals draw from the X-Men films, Deadpool 1–2, Logan, and Loki. Watch those first to avoid major spoilers.', watchAfter: 'Deadpool 2' },
  'Iron Man 2': { label: 'Avengers setup', note: 'This introduces major Avengers-era characters and tech threads that pay off in The Avengers.', watchAfter: 'Iron Man' },
  'Thor': { label: 'Avengers setup', note: 'Watch before The Avengers; its ending and characters directly lead into the team-up.', watchAfter: 'Iron Man 2' },
  'The Avengers': { label: 'Saga milestone', note: 'This is the first major crossover. Watch Iron Man, Iron Man 2, Thor, and Captain America: The First Avenger first.', watchAfter: 'Thor' },
  'Iron Man 3': { label: 'Post-Avengers aftermath', note: 'Watch The Avengers first. Tony’s story begins in the aftermath of the Battle of New York.', watchAfter: 'The Avengers' },
  'Thor: The Dark World': { label: 'Infinity Stone setup', note: 'Watch The Avengers first; its post-credit scene introduces an important Infinity Stone thread.', watchAfter: 'The Avengers' },
  'Guardians of the Galaxy': { label: 'Infinity Stone setup', note: 'Watch The Avengers first to recognize the wider Infinity Stone story this film expands.', watchAfter: 'The Avengers' },
  'Avengers: Age of Ultron': { label: 'Team-up prerequisite', note: 'Watch The Avengers first. This sequel changes the team and introduces threads that lead into Civil War and Infinity War.', watchAfter: 'The Avengers' },
  'Captain America: Civil War': { label: 'Major turning point', note: 'Watch The Avengers and Age of Ultron first. Its conflict reshapes the heroes before Infinity War.', watchAfter: 'Avengers: Age of Ultron' },
  'Black Panther': { label: 'Civil War aftermath', note: 'Watch Captain America: Civil War first; Wakanda and T’Challa are introduced there.', watchAfter: 'Captain America: Civil War' },
  'Spider-Man: Homecoming': { label: 'Character prerequisite', note: 'Watch Captain America: Civil War first. Peter Parker’s MCU introduction happens there.', watchAfter: 'Captain America: Civil War' },
  'Doctor Strange': { label: 'Infinity Stone setup', note: 'Its post-credit scenes set up Thor: Ragnarok and the Infinity Saga. Watch through the credits.', watchAfter: 'Avengers: Age of Ultron' },
  'Thor: Ragnarok': { label: 'Infinity War lead-in', note: 'Watch Thor, The Avengers, and Avengers: Age of Ultron first; its ending flows directly into Infinity War.', watchAfter: 'Doctor Strange' },
  'Avengers: Infinity War': { label: 'Saga prerequisite', note: 'Watch the earlier Avengers films and Guardians Vol. 1–2 first; this begins the two-part Thanos finale.', watchAfter: 'Avengers: Age of Ultron' },
  'Avengers: Endgame': { label: 'Full saga spoiler', note: 'Watch Infinity War immediately before this. Avoid trailers and post-credit discussions if you want the full finale unspoiled.', watchAfter: 'Avengers: Infinity War' },
  'Spider-Man: No Way Home': { label: 'Major multiverse spoilers', note: 'Watch Far From Home first, then the earlier live-action Spider-Man films and Venom films for the biggest reveals.', watchAfter: 'Spider-Man: Far From Home' },
  'Black Panther: Wakanda Forever': { label: 'Character aftermath', note: 'Watch Black Panther and Avengers: Endgame first; its story follows both films’ events.', watchAfter: 'Black Panther' },
  'Guardians of the Galaxy Vol. 2': { label: 'Credits setup', note: 'Watch Guardians Vol. 1 first and stay through the credits; several scenes set up later Guardians stories.', watchAfter: 'Guardians of the Galaxy' },
};

export function getTitleGuidance(item) {
  if (!item) return null;
  const specific = SPOILER_GUIDANCE[item.title];
  if (specific) return specific;
  if (item.prereq && !/^None( |$)/.test(item.prereq) && item.prereq !== 'General MCU knowledge') {
    return { label: 'Watch before this', note: `For the intended story context, watch ${item.prereq} first.`, watchAfter: item.prereq };
  }
  return null;
}

export const MULTIVERSE_BRANCH_TAGS = { main: ['MCU Sacred Timeline'], whatif: ['What If Branch'], legacy: ['Legacy Universe Branch'] };
