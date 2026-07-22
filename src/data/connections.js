// Story bridges: defines which titles are story-connected between two parts
// of the same series group. Only these titles appear as interstitials in the
// viewing roadmap. Bridge IDs MUST fall strictly between source.order and target.order.

export const STORY_BRIDGES = [
  // ═══════════════════════════════════════════════════════════════════════════
  // LOKI SAGA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 31, // Loki S1 (order 31)
    targetId: 33, // Loki S2 (order 33)
    bridges: [
      { id: 32, note: 'Introduces Kang the Conqueror — the villain behind the TVA and the Multiverse crisis that drives Loki S2' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WANDA SAGA — WandaVision → Agatha → VisionQuest
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 25, // WandaVision S1 (25)
    targetId: 44, // Agatha All Along S1 (44)
    bridges: [
      { id: 43, note: 'Wanda\'s corruption by the Darkhold and transformation into the Scarlet Witch — Agatha\'s story follows from Wanda\'s hex' }
    ]
  },
  {
    sourceId: 44, // Agatha All Along S1 (44)
    targetId: 63, // VisionQuest (63)
    bridges: []
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPTAIN AMERICA (CLASSIC) — First Avenger → Winter Soldier → Civil War
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 1,  // The First Avenger (1)
    targetId: 9,  // The Winter Soldier (9)
    bridges: [
      { id: 6, note: 'The Avengers — Cap is thawed from the ice, the Tesseract reappears, and SHIELD\'s Phase 2 weapons program begins' }
    ]
  },
  {
    sourceId: 9,  // The Winter Soldier (9)
    targetId: 16, // Civil War (16)
    bridges: [
      { id: 13, note: 'Age of Ultron — Sokovia\'s destruction leads directly to the Sokovia Accords that fracture the Avengers in Civil War' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // IRON MAN TRILOGY — Iron Man → IM2 → IM3
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 2,  // Iron Man (2)
    targetId: 4,  // Iron Man 2 (4)
    bridges: [
      { id: 3, note: 'The Incredible Hulk — post-credits scene has Tony Stark recruiting General Ross, linking the early MCU together' }
    ]
  },
  {
    sourceId: 4,  // Iron Man 2 (4)
    targetId: 10, // Iron Man 3 (10)
    bridges: [
      { id: 6, note: 'The Avengers — Tony\'s near-death wormhole experience causes the PTSD and anxiety attacks that define Iron Man 3' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THOR SAGA — Thor → Dark World → Ragnarok → Love and Thunder
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 5,  // Thor (5)
    targetId: 7,  // The Dark World (7)
    bridges: [
      { id: 6, note: 'The Avengers — Loki is captured with the Tesseract, setting up his imprisonment and Asgard\'s role guarding the Space Stone' }
    ]
  },
  {
    sourceId: 7,  // The Dark World (7)
    targetId: 21, // Ragnarok (21)
    bridges: [
      { id: 13, note: 'Age of Ultron — Thor\'s vision of Ragnarok in the Water of Sights sets him investigating the Infinity Stones' }
    ]
  },
  {
    sourceId: 21, // Ragnarok (21)
    targetId: 38, // Love and Thunder (38)
    bridges: [
      { id: 22, note: 'Infinity War — Thor\'s failure to stop Thanos and the destruction of Asgard shapes his quest for purpose' },
      { id: 24, note: 'Endgame — Thor\'s depression, weight gain, and self-doubt arc continues into Love and Thunder' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANT-MAN TRILOGY — Ant-Man → Ant-Man & Wasp → Quantumania
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 15, // Ant-Man (15)
    targetId: 20, // Ant-Man & the Wasp (20)
    bridges: [
      { id: 16, note: 'Civil War — Scott\'s involvement with Team Cap puts him under house arrest, driving the entire plot of Ant-Man & the Wasp' }
    ]
  },
  {
    sourceId: 20, // Ant-Man & the Wasp (20)
    targetId: 32, // Quantumania (32)
    bridges: [
      { id: 24, note: 'Endgame — the Quantum Realm is key to the time heist; Scott\'s 5-year absence leads directly into Quantumania' },
      { id: 31, note: 'Loki S1 — establishes Kang variants and the multiverse framework that Quantumania\'s villain operates within' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GUARDIANS SAGA — GotG → Vol.2 → Holiday Special → Vol.3
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 11, // Guardians Vol. 2 (11)
    targetId: 39, // Guardians Vol. 3 (39)
    bridges: [
      { id: 22, note: 'Infinity War — Gamora\'s death and the Guardians meeting the Avengers reshapes the team dynamic for Vol. 3' },
      { id: 24, note: 'Endgame — the 2014 Gamora arrives through time travel, setting up the new status quo and Peter\'s emotional arc' },
      { id: 30, note: 'Guardians Holiday Special — introduces Mantis\'s lineage secret and establishes the new team dynamic on Knowhere' },
      { id: 38, note: 'Thor: Love and Thunder — the Guardians appear in the opening, setting off on separate adventures before Vol. 3' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPTAIN AMERICA (NEW) — Falcon & Winter Soldier → Brave New World
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 26, // Falcon & Winter Soldier S1 (26)
    targetId: 53, // Brave New World (53)
    bridges: [
      { id: 40, note: 'Wakanda Forever — the emergence of adamantium and shifting global alliances set the geopolitical stage for Brave New World' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DAREDEVIL MCU — Echo → Born Again S1 → S2 → S3
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 50, // Echo S1 (50)
    targetId: 51, // Born Again S1 (51)
    bridges: []
  },
  {
    sourceId: 51, // Born Again S1 (51)
    targetId: 52, // Born Again S2 (52)
    bridges: [
      { id: 61, note: 'The Punisher: One Last Kill — Frank Castle\'s return to the street-level MCU leads into Born Again S2' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WHAT IF...? — S1 → S2 → S3
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 34, // What If...? S1 (34)
    targetId: 35, // What If...? S2 (35)
    bridges: []
  },
  {
    sourceId: 35, // What If...? S2 (35)
    targetId: 36, // What If...? S3 (36)
    bridges: []
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPIDER-MAN — Homecoming → Far From Home → No Way Home → Brand New Day
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 19, // Homecoming (19)
    targetId: 27, // Far From Home (27)
    bridges: [
      { id: 22, note: 'Infinity War — Peter is dusted on Titan, his loss devastates Tony — the mentor relationship reaches its emotional peak' },
      { id: 24, note: 'Endgame — Peter returns for the final battle, witnesses Tony\'s sacrifice, inherits being Iron Man\'s protégé' }
    ]
  },
  {
    sourceId: 28, // No Way Home (28)
    targetId: 62, // Brand New Day (62)
    bridges: [
      { id: 43, note: 'Doctor Strange: Multiverse of Madness — further destabilizes the multiverse continuing the chaos from No Way Home' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BLACK PANTHER — Black Panther → Wakanda Forever → Ironheart → Eyes of Wakanda
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 18, // Black Panther (18)
    targetId: 40, // Wakanda Forever (40)
    bridges: [
      { id: 22, note: 'Infinity War — T\'Challa is dusted, Wakanda\'s role in the battle for Earth sets up its global position' },
      { id: 24, note: 'Endgame — T\'Challa returns, Wakanda leads the charge — the nation\'s grief in Wakanda Forever echoes real loss' }
    ]
  },
  {
    sourceId: 40, // Wakanda Forever (40)
    targetId: 54, // Ironheart S1 (54)
    bridges: [
      { id: 53, note: "Captain America: Brave New World — adamantium becomes a global power struggle, echoing Wakanda's vibranium sovereignty and setting the political stage for Ironheart" }
    ]
  },
  {
    sourceId: 54, // Ironheart S1 (54)
    targetId: 59, // Eyes of Wakanda S1 (59)
    bridges: [
      { id: 56, note: "Fantastic Four: First Steps — Reed Richards' genius mirrors Riri's, while the cosmic scale expands the world Wakanda operates within" }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCTOR STRANGE — Doctor Strange → Multiverse of Madness
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 14, // Doctor Strange (14)
    targetId: 43, // Multiverse of Madness (43)
    bridges: [
      { id: 22, note: 'Infinity War — Strange\'s 14-million-futures gambit establishes him as the MCU\'s premier mystical strategist' },
      { id: 24, note: 'Endgame — Strange returns from the blip to orchestrate the final battle, cementing his role as protector of Earth' },
      { id: 25, note: 'WandaVision — Wanda\'s grief and discovery of her Scarlet Witch identity sets her up as MoM\'s antagonist' },
      { id: 28, note: 'Spider-Man: No Way Home — Strange\'s botched memory spell tears open the multiverse, foreshadowing MoM\'s chaos' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPTAIN MARVEL / MS. MARVEL / THE MARVELS / SECRET INVASION — cosmic & spy saga
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 23, // Captain Marvel (23)
    targetId: 48, // The Marvels (48)
    bridges: [
      { id: 25, note: 'WandaVision — introduces adult Monica Rambeau who gains spectrum powers, setting up her role as one of the three Marvels' },
      { id: 47, note: 'Ms. Marvel S1 — introduces Kamala Khan and her bangle, directly connected to the cosmic entanglement in The Marvels' }
    ]
  },
  {
    sourceId: 48, // The Marvels (48)
    targetId: 49, // Secret Invasion S1 (49)
    bridges: []
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HELA / WIDOW — Black Widow → Hawkeye (Yelena arc)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 17, // Black Widow (17)
    targetId: 29, // Hawkeye S1 (29)
    bridges: [
      { id: 24, note: 'Endgame — Natasha\'s sacrifice on Vormir is directly referenced in Hawkeye; Yelena\'s post-credits scene sets up her appearance' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HULK / SHE-HULK — The Incredible Hulk → She-Hulk
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 3,  // The Incredible Hulk (3)
    targetId: 46, // She-Hulk S1 (46)
    bridges: [
      { id: 6, note: 'The Avengers — establishes Bruce Banner\'s arc from loner to team player, where he is when mentoring Jen in She-Hulk' },
      { id: 42, note: 'Shang-Chi — the post-credits scene with Wong and the Abomination directly sets up Abomination\'s role in She-Hulk' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHANG-CHI — solo entry; bridges activate when sequels or connected titles are added to 'shang-chi' seriesGroup
  // ═══════════════════════════════════════════════════════════════════════════
  // (Shang-Chi currently has one entry — bridges will fire when Shang-Chi 2 arrives)

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTIVERSE FINALE — Thunderbolts* → Fantastic Four → Doomsday → Secret Wars
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 55, // Thunderbolts* (55)
    targetId: 65, // Avengers: Doomsday (65)
    bridges: [
      { id: 56, note: 'Fantastic Four: First Steps — introduces Reed Richards, whose rivalry with Doctor Doom is central to Doomsday' }
    ]
  },
  {
    sourceId: 65, // Avengers: Doomsday (65)
    targetId: 67, // Avengers: Secret Wars (67)
    bridges: []
  },

  // ── WONDER MAN — S1 → S2
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 57, // Wonder Man S1 (57)
    targetId: 64, // Wonder Man S2 (64)
    bridges: []
  },

  // ── I AM GROOT — S1 → S2
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 12,  // I Am Groot S1 (12)
    targetId: 203, // I Am Groot S2 (12)
    bridges: []
  }
];
