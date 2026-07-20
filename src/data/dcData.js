export const DC_PHASES = [
  { id: 1, label: 'Era 1', name: 'DCEU Foundations', color: '#08204a' },
  { id: 2, label: 'Era 2', name: 'DCEU Expansion', color: '#0b3a78' },
  { id: 3, label: 'Era 3', name: 'DCEU Finale', color: '#0d4f9c' },
  { id: 4, label: 'Elseworlds', name: 'Standalone DC Stories', color: '#1367c8' },
  { id: 5, label: 'DCU', name: 'Gods and Monsters', color: '#2f80ed' },
];

export const DC_RAW = [
  { id: 5001, order: 1, title: 'Wonder Woman', ageRating: 'PG-13', year: 2017, phase: 1, type: 'film', essential: true, runtime: 141, releaseDate: '2017-06-02', status: 'unwatched', prereq: '—' },
  { id: 5002, order: 2, title: 'Wonder Woman 1984', ageRating: 'PG-13', year: 2020, phase: 1, type: 'film', essential: false, runtime: 151, releaseDate: '2020-12-25', status: 'unwatched', prereq: 'Wonder Woman' },
  { id: 5003, order: 3, title: 'Man of Steel', ageRating: 'PG-13', year: 2013, phase: 1, type: 'film', essential: true, runtime: 143, releaseDate: '2013-06-14', status: 'unwatched', prereq: '—' },
  { id: 5004, order: 4, title: 'Batman v Superman: Dawn of Justice', ageRating: 'PG-13', year: 2016, phase: 1, type: 'film', essential: true, runtime: 152, releaseDate: '2016-03-25', status: 'unwatched', prereq: 'Man of Steel' },
  { id: 5005, order: 5, title: 'Suicide Squad', ageRating: 'PG-13', year: 2016, phase: 1, type: 'film', essential: false, runtime: 123, releaseDate: '2016-08-05', status: 'unwatched', prereq: 'Batman v Superman: Dawn of Justice' },
  { id: 5006, order: 6, title: 'Justice League', ageRating: 'PG-13', year: 2017, phase: 1, type: 'film', essential: false, runtime: 120, releaseDate: '2017-11-17', status: 'unwatched', prereq: 'Batman v Superman: Dawn of Justice' },
  { id: 5007, order: 7, title: 'Zack Snyder’s Justice League', ageRating: 'R', year: 2021, phase: 2, type: 'film', essential: true, runtime: 242, releaseDate: '2021-03-18', status: 'unwatched', prereq: 'Batman v Superman: Dawn of Justice' },
  { id: 5008, order: 8, title: 'Aquaman', ageRating: 'PG-13', year: 2018, phase: 2, type: 'film', essential: true, runtime: 143, releaseDate: '2018-12-21', status: 'unwatched', prereq: 'Justice League' },
  { id: 5009, order: 9, title: 'Shazam!', ageRating: 'PG-13', year: 2019, phase: 2, type: 'film', essential: true, runtime: 132, releaseDate: '2019-04-05', status: 'unwatched', prereq: 'Justice League' },
  { id: 5010, order: 10, title: 'Birds of Prey', ageRating: 'R', year: 2020, phase: 2, type: 'film', essential: false, runtime: 109, releaseDate: '2020-02-07', status: 'unwatched', prereq: 'Suicide Squad' },
  { id: 5011, order: 11, title: 'The Suicide Squad', ageRating: 'R', year: 2021, phase: 2, type: 'film', essential: true, runtime: 132, releaseDate: '2021-08-06', status: 'unwatched', prereq: 'Suicide Squad' },
  { id: 5012, order: 12, title: 'Peacemaker Season 1', ageRating: 'TV-MA', year: 2022, phase: 3, type: 'series', essential: false, runtime: 368, releaseDate: '2022-01-13', status: 'unwatched', prereq: 'The Suicide Squad', tmdbId: 105971, season: 1, epStart: 1, epEnd: 8 },
  { id: 5013, order: 13, title: 'Black Adam', ageRating: 'PG-13', year: 2022, phase: 3, type: 'film', essential: false, runtime: 125, releaseDate: '2022-10-21', status: 'unwatched', prereq: 'Shazam!' },
  { id: 5014, order: 14, title: 'Shazam! Fury of the Gods', ageRating: 'PG-13', year: 2023, phase: 3, type: 'film', essential: false, runtime: 130, releaseDate: '2023-03-17', status: 'unwatched', prereq: 'Shazam!' },
  { id: 5015, order: 15, title: 'The Flash', ageRating: 'PG-13', year: 2023, phase: 3, type: 'film', essential: true, runtime: 144, releaseDate: '2023-06-16', status: 'unwatched', prereq: 'Zack Snyder’s Justice League' },
  { id: 5016, order: 16, title: 'Blue Beetle', ageRating: 'PG-13', year: 2023, phase: 3, type: 'film', essential: false, runtime: 127, releaseDate: '2023-08-18', status: 'unwatched', prereq: '—' },
  { id: 5017, order: 17, title: 'Aquaman and the Lost Kingdom', ageRating: 'PG-13', year: 2023, phase: 3, type: 'film', essential: false, runtime: 124, releaseDate: '2023-12-22', status: 'unwatched', prereq: 'Aquaman' },
  { id: 5018, order: 18, title: 'Joker', ageRating: 'R', year: 2019, phase: 4, type: 'film', essential: false, runtime: 122, releaseDate: '2019-10-04', status: 'unwatched', prereq: 'Standalone Elseworlds' },
  { id: 5019, order: 19, title: 'The Batman', ageRating: 'PG-13', year: 2022, phase: 4, type: 'film', essential: false, runtime: 176, releaseDate: '2022-03-04', status: 'unwatched', prereq: 'Standalone Elseworlds' },
  { id: 5020, order: 20, title: 'Joker: Folie à Deux', ageRating: 'R', year: 2024, phase: 4, type: 'film', essential: false, runtime: 138, releaseDate: '2024-10-04', status: 'unwatched', prereq: 'Joker' },
  { id: 5021, order: 21, title: 'Creature Commandos Season 1', ageRating: 'TV-MA', year: 2024, phase: 5, type: 'series', essential: false, runtime: 175, releaseDate: '2024-12-05', status: 'unwatched', prereq: 'The Suicide Squad', tmdbId: 124364, season: 1, epStart: 1, epEnd: 7 },
  { id: 5022, order: 22, title: 'Superman', ageRating: 'PG-13', year: 2025, phase: 5, type: 'film', essential: true, runtime: 0, releaseDate: '2025-07-11', status: 'unwatched', upcoming: true, prereq: 'Creature Commandos Season 1' },
];

export const DC_CORE_IDS = new Set(DC_RAW.map(item => item.id));
