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
  'Captain Marvel': { label: 'Post-credit spoiler', note: 'The post-credit scene takes place after Avengers: Infinity War. Watch the credits only after Infinity War if you want to avoid that spoiler.', watchAfter: 'Avengers: Infinity War' },
  'Black Widow': { label: 'Post-credit spoiler', note: 'The post-credit scene leads directly into Hawkeye. Watch it after Hawkeye S1 if you want to avoid its setup and character reveal.', watchAfter: 'Hawkeye S1' },
  'The Consultant': { label: 'Placement note', note: 'Best placed after The Incredible Hulk and before The Avengers; it is a short set during the early Avengers buildup.', watchAfter: 'The Incredible Hulk' },
  'Peter’s To-Do List': { label: 'Short placement', note: 'Watch after Spider-Man: Homecoming; it is a short set during Peter’s Homecoming-era story.', watchAfter: 'Spider-Man: Homecoming' },
  'Avengers: Endgame': { label: 'Saga spoiler', note: 'Watch Avengers: Infinity War immediately before this. It continues directly from the Snap cliffhanger.', watchAfter: 'Avengers: Infinity War' },
  'Avengers: Secret Wars': { label: 'Finale prerequisite', note: 'Watch Avengers: Doomsday first; Secret Wars is the concluding chapter of the two-part Avengers event.', watchAfter: 'Avengers: Doomsday' },
  'Avengers: Infinity War': { label: 'Saga milestone', note: 'This begins the two-part Thanos finale. The earlier Avengers and Guardians films provide important character and Infinity Stone context.', watchAfter: 'Avengers: Age of Ultron' },
  'Spider-Man: Far From Home': { label: 'Endgame aftermath', note: 'Watch Avengers: Endgame first. The story directly follows its world-changing events and deals with their aftermath.', watchAfter: 'Avengers: Endgame' },
  'Spider-Man: No Way Home': { label: 'Multiverse prerequisite', note: 'Watch Far From Home first. For the major legacy reveals, watch the earlier live-action Spider-Man films before this.', watchAfter: 'Spider-Man: Far From Home' },
  'Doctor Strange: Multiverse of Madness': { label: 'Story prerequisite', note: 'Watch WandaVision and Spider-Man: No Way Home first. Both connect directly to major characters and story elements here.', watchAfter: 'WandaVision S1' },
  'Thor: Love and Thunder': { label: 'Story prerequisite', note: 'Watch Thor: Ragnarok, Avengers: Infinity War, and Avengers: Endgame first. The film continues Thor’s story after those events.', watchAfter: 'Avengers: Endgame' },
  'Guardians of the Galaxy Vol. 3': { label: 'Emotional prerequisite', note: 'Watch Guardians Vol. 1–2, Infinity War, Endgame, and the Holiday Special first. These establish the Guardians’ relationships and recent history.', watchAfter: 'Guardians Holiday Special' },
  'The Marvels': { label: 'Character prerequisite', note: 'Watch Captain Marvel, WandaVision, and Ms. Marvel first. Carol Danvers, Monica Rambeau, and Kamala Khan’s stories converge here.', watchAfter: 'Ms. Marvel S1' },
  'Hawkeye S1': { label: 'Character spoiler', note: 'Watch Avengers: Endgame and Black Widow first; Yelena’s story continues from Black Widow’s post-credit scene.', watchAfter: 'Black Widow' },
  'Ant-Man & the Wasp: Quantumania': { label: 'Kang introduction', note: 'Watch Ant-Man, Ant-Man & the Wasp, and Avengers: Endgame first. The film introduces a major new Kang storyline.', watchAfter: 'Avengers: Endgame' },
  'Deadpool & Wolverine': { label: 'Legacy prerequisite', note: 'For the full experience, watch Deadpool, Deadpool 2, and Logan first. Familiarity with the X-Men film universe adds context to its multiverse story.', watchAfter: 'Deadpool 2' },
  'Iron Man 2': { label: 'Avengers setup', note: 'This is part of the early Avengers buildup and introduces characters and technology that return in The Avengers.', watchAfter: 'Iron Man' },
  'Iron Man 3': { label: 'Avengers aftermath', note: 'Watch The Avengers first. This story follows Tony in the aftermath of the Battle of New York.', watchAfter: 'The Avengers' },
  'Thor: The Dark World': { label: 'Infinity Saga setup', note: 'Watch The Avengers first. Its story follows the Battle of New York and expands the Infinity Stone storyline.', watchAfter: 'The Avengers' },
  'Guardians of the Galaxy': { label: 'Cosmic introduction', note: 'This largely stands on its own and introduces the cosmic side of the MCU and a major Infinity Stone storyline.', watchAfter: 'The Avengers' },
  'Avengers: Age of Ultron': { label: 'Direct sequel', note: 'Watch The Avengers first. This continues the team’s story and establishes character and Infinity Saga threads that matter later.', watchAfter: 'The Avengers' },
  'Captain America: Civil War': { label: 'Major turning point', note: 'Watch The Avengers and Age of Ultron first. The fallout from both films drives the conflict between the heroes.', watchAfter: 'Avengers: Age of Ultron' },
  'Black Panther': { label: 'Civil War aftermath', note: 'Watch Captain America: Civil War first; T’Challa and Wakanda are introduced there, and this story follows the aftermath.', watchAfter: 'Captain America: Civil War' },
  'Spider-Man: Homecoming': { label: 'Character introduction', note: 'Watch Captain America: Civil War first; Peter Parker makes his MCU debut there.', watchAfter: 'Captain America: Civil War' },
  'Doctor Strange': { label: 'Credits matter', note: 'Stay through the credits. The post-credit scenes connect Doctor Strange to Thor: Ragnarok and the wider Infinity Saga.', watchAfter: 'Avengers: Age of Ultron' },
  'Thor: Ragnarok': { label: 'Infinity War lead-in', note: 'Its ending leads directly into Avengers: Infinity War. Watch through the credits for additional setup.', watchAfter: 'Doctor Strange' },
  'Black Panther: Wakanda Forever': { label: 'Character aftermath', note: 'Watch Black Panther and Avengers: Endgame first; this story follows the loss of T’Challa and the wider aftermath of the earlier films.', watchAfter: 'Black Panther' },
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
