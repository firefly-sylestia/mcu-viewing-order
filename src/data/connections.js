// Story bridges: defines which titles are story-connected between two parts
// of the same series group. Only these titles appear as interstitials in the
// viewing roadmap, replacing the old "show everything chronologically" behavior.
//
// Each entry maps { sourceId, targetId } (two entries from the same seriesGroup)
// to a list of bridges — titles that are narratively essential to watch between them.

export const STORY_BRIDGES = [
  // ── Loki Saga ──────────────────────────────────────────────────────────────
  {
    sourceId: 31, // Loki S1
    targetId: 33, // Loki S2
    bridges: [
      {
        id: 32,
        note: 'Introduces Kang the Conqueror — the villain behind the TVA and the Multiverse crisis that drives Loki S2'
      }
    ]
  },

  // ── Wanda Saga ─────────────────────────────────────────────────────────────
  {
    sourceId: 25, // WandaVision S1
    targetId: 44, // Agatha All Along S1
    bridges: [
      {
        id: 43,
        note: 'Wanda\'s corruption by the Darkhold and her full transformation into the Scarlet Witch — Agatha\'s story directly follows from these events'
      }
    ]
  },

  // ── Captain America (Classic) ──────────────────────────────────────────────
  {
    sourceId: 1,  // The First Avenger
    targetId: 9,  // The Winter Soldier
    bridges: [
      {
        id: 6,
        note: 'The Avengers — Cap is thawed from the ice, the Tesseract reappears, and SHIELD\'s Phase 2 weapons program begins'
      }
    ]
  },
  {
    sourceId: 9,  // The Winter Soldier
    targetId: 16, // Civil War
    bridges: [
      {
        id: 13,
        note: 'Age of Ultron — Sokovia\'s destruction leads directly to the Sokovia Accords that fracture the Avengers in Civil War'
      }
    ]
  },

  // ── Iron Man Trilogy ───────────────────────────────────────────────────────
  {
    sourceId: 4,  // Iron Man 2
    targetId: 10, // Iron Man 3
    bridges: [
      {
        id: 6,
        note: 'The Avengers — Tony\'s near-death experience in the wormhole causes the PTSD that defines Iron Man 3'
      }
    ]
  },

  // ── Thor Saga ──────────────────────────────────────────────────────────────
  {
    sourceId: 7,  // The Dark World
    targetId: 21, // Ragnarok
    bridges: [
      {
        id: 13,
        note: 'Age of Ultron — Thor\'s vision of Ragnarok in the Water of Sights sets him on the path to investigate the Infinity Stones'
      }
    ]
  },
  {
    sourceId: 21, // Ragnarok
    targetId: 38, // Love and Thunder
    bridges: [
      {
        id: 22,
        note: 'Infinity War — Thor\'s failure to stop Thanos and the destruction of his people directly shapes his quest in Love and Thunder'
      },
      {
        id: 24,
        note: 'Endgame — Thor\'s depression and self-doubt arc continues into Love and Thunder where he seeks a new purpose'
      }
    ]
  },

  // ── Ant-Man Trilogy ────────────────────────────────────────────────────────
  {
    sourceId: 15, // Ant-Man
    targetId: 20, // Ant-Man & the Wasp
    bridges: [
      {
        id: 16,
        note: 'Civil War — Scott\'s involvement with Team Cap puts him under house arrest, which drives the plot of Ant-Man & the Wasp'
      }
    ]
  },
  {
    sourceId: 20, // Ant-Man & the Wasp
    targetId: 32, // Quantumania
    bridges: [
      {
        id: 24,
        note: 'Endgame — the Quantum Realm is key to the time heist; Scott\'s time there leads directly to the events of Quantumania'
      },
      {
        id: 31,
        note: 'Loki S1 — establishes Kang variants and the multiverse framework that Quantumania\'s villain operates within'
      }
    ]
  },

  // ── Guardians Saga ─────────────────────────────────────────────────────────
  {
    sourceId: 11, // Guardians Vol. 2
    targetId: 39, // Guardians Vol. 3
    bridges: [
      {
        id: 22,
        note: 'Infinity War — Gamora\'s death and the Guardians meeting the Avengers reshapes the team dynamic for Vol. 3'
      },
      {
        id: 24,
        note: 'Endgame — the 2014 Gamora arrives, setting up the new status quo and Peter\'s emotional arc in Vol. 3'
      }
    ]
  },

  // ── Captain America (New) ──────────────────────────────────────────────────
  {
    sourceId: 26, // Falcon & Winter Soldier S1
    targetId: 53, // Brave New World
    bridges: [
      {
        id: 40,
        note: 'Wakanda Forever — the emergence of adamantium and shifting global alliances set the geopolitical stage for Brave New World'
      }
    ]
  },

  // ── Daredevil MCU ──────────────────────────────────────────────────────────
  {
    sourceId: 50, // Echo S1
    targetId: 51, // Born Again S1
    bridges: [
      {
        id: 29,
        note: 'Hawkeye S1 — Kingpin\'s first MCU appearance and his confrontation with Echo\'s backstory thread into Born Again'
      }
    ]
  }
];
