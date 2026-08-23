export const SONY_PHASES = [
  { id: 1, label: 'Era 1', name: 'Spider-Man Classics', color: '#b51f2f' },
  { id: 2, label: 'Era 2', name: 'The Amazing Spider-Man', color: '#c94c3b' },
  { id: 3, label: 'Era 3', name: 'Spider-Verse', color: '#e05b3f' },
  { id: 4, label: 'Era 4', name: 'Sony Spider-Man Universe', color: '#8d1d32' },
];

const sony = (id, order, title, year, tmdbId, runtime, phase, seriesGroup, desc, essential = true) => ({
  id, order, title, ageRating: 'PG-13', year, phase, type: 'film', essential, runtime,
  releaseDate: `${year}-01-01`, status: 'unwatched', prereq: '—', tmdbId, seriesGroup, desc,
});

export const SONY_RAW = [
  sony(7001, 1, 'Spider-Man', 2002, 557, 121, 1, 'raimi-spider-man', 'Peter Parker gains incredible powers and must face the Green Goblin while learning what it means to be a hero.'),
  sony(7002, 2, 'Spider-Man 2', 2004, 558, 127, 1, 'raimi-spider-man', 'Peter struggles to balance his life as Spider-Man with his dreams while Doctor Octopus threatens New York.'),
  sony(7003, 3, 'Spider-Man 3', 2007, 559, 139, 1, 'raimi-spider-man', 'Peter faces Sandman, Venom, and the darker influence of an alien symbiote.'),
  sony(7004, 4, 'The Amazing Spider-Man', 2012, 1930, 136, 2, 'amazing-spider-man', 'Peter Parker uncovers the secrets behind his parents and battles the Lizard while finding his place as Spider-Man.'),
  sony(7005, 5, 'The Amazing Spider-Man 2', 2014, 102382, 142, 2, 'amazing-spider-man', 'Peter faces Electro and a returning Harry Osborn as he fights to protect the people he loves.'),
  sony(7006, 6, 'Spider-Man: Into the Spider-Verse', 2018, 324857, 117, 3, 'spider-verse', 'Miles Morales becomes Spider-Man and discovers a multiverse of heroes who must work together to save every reality.'),
  sony(7007, 7, 'Spider-Man: Across the Spider-Verse', 2023, 569094, 140, 3, 'spider-verse', 'Miles travels across the Spider-Verse and faces a choice between saving the people he loves and protecting the multiverse.'),
  sony(7008, 8, 'Venom', 2018, 335983, 112, 4, 'venom', 'Journalist Eddie Brock becomes the host of an alien symbiote and discovers an unlikely protector within himself.'),
  sony(7009, 9, 'Venom: Let There Be Carnage', 2021, 580489, 97, 4, 'venom', 'Eddie and Venom face the dangerous serial killer Cletus Kasady and his symbiote, Carnage.'),
  sony(7010, 10, 'Morbius', 2022, 526896, 105, 4, 'sony-ssu', 'A brilliant scientist accidentally transforms himself into a living vampire while searching for a cure to his rare disease.', false),
  sony(7011, 11, 'Madame Web', 2024, 634492, 116, 4, 'sony-ssu', 'Cassandra Webb develops powers of clairvoyance and must protect three young women from a dangerous future.', false),
  sony(7012, 12, 'Kraven the Hunter', 2024, 539972, 127, 4, 'sony-ssu', 'Kraven is a ruthless hunter whose complex relationship with his father sets him on a path of revenge and power.', false),
  sony(7013, 13, 'Venom: The Last Dance', 2024, 912649, 109, 4, 'venom', 'Eddie and Venom are on the run, hunted by both worlds as their extraordinary journey reaches its final chapter.', false),
];

export const SONY_CORE_IDS = new Set(SONY_RAW.map(item => item.id));
