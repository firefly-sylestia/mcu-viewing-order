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
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DC UNIVERSE BRIDGES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── WONDER WOMAN — WW → WW84
  {
    sourceId: 5001, // Wonder Woman (1)
    targetId: 5002, // Wonder Woman 1984 (2)
    bridges: []
  },

  // ── DCEU SUPERMAN — Man of Steel → BvS → ZS Justice League
  {
    sourceId: 5003, // Man of Steel (3)
    targetId: 5004, // Batman v Superman (4)
    bridges: []
  },
  {
    sourceId: 5004, // Batman v Superman (4)
    targetId: 5007, // Zack Snyder's Justice League (7)
    bridges: [
      { id: 5005, note: 'Suicide Squad — Amanda Waller assembles Task Force X in the aftermath of Superman\'s death, showing the government\'s response to the power vacuum' },
      { id: 5006, note: 'Justice League (theatrical) — the heavily altered theatrical cut; Snyder Cut restores the full vision' }
    ]
  },

  // ── SUICIDE SQUAD — Suicide Squad → The Suicide Squad → Peacemaker
  {
    sourceId: 5005, // Suicide Squad (5)
    targetId: 5011, // The Suicide Squad (11)
    bridges: [
      { id: 5010, note: 'Birds of Prey — Harley Quinn emancipates from the Joker and builds her own crew, bridging her arc to the new Task Force X' }
    ]
  },
  {
    sourceId: 5011, // The Suicide Squad (11)
    targetId: 5012, // Peacemaker S1 (12)
    bridges: []
  },

  // ── AQUAMAN — Aquaman → Lost Kingdom
  {
    sourceId: 5008, // Aquaman (8)
    targetId: 5017, // Aquaman and the Lost Kingdom (17)
    bridges: [
      { id: 5015, note: 'The Flash — the multiverse-altering events ripple across the DCEU timeline, affecting all heroes including Arthur Curry' }
    ]
  },

  // ── SHAZAM — Shazam! → Black Adam → Fury of the Gods
  {
    sourceId: 5009, // Shazam! (9)
    targetId: 5013, // Black Adam (13)
    bridges: []
  },
  {
    sourceId: 5013, // Black Adam (13)
    targetId: 5014, // Shazam! Fury of the Gods (14)
    bridges: []
  },

  // ── RE(E)VES BATMAN — The Batman → The Penguin → Part II
  {
    sourceId: 5019, // The Batman (19)
    targetId: 5048, // The Batman Part II (48)
    bridges: [
      { id: 5045, note: 'The Penguin S1 — Oswald Cobblepot rises through Gotham\'s criminal underworld after Falcone\'s death, setting the stage for Part II' }
    ]
  },

  // ── JOKER CYCLE — Joker → Folie à Deux
  {
    sourceId: 5018, // Joker (18)
    targetId: 5020, // Joker: Folie à Deux (20)
    bridges: []
  },

  // ── BURTON BATMAN — Batman → Batman Returns
  {
    sourceId: 5023, // Batman (23)
    targetId: 5024, // Batman Returns (24)
    bridges: []
  },

  // ── DARK KNIGHT TRILOGY — Begins → Dark Knight → Rises
  {
    sourceId: 5025, // Batman Begins (25)
    targetId: 5026, // The Dark Knight (26)
    bridges: []
  },
  {
    sourceId: 5026, // The Dark Knight (26)
    targetId: 5027, // The Dark Knight Rises (27)
    bridges: []
  },

  // ── DCU SUPERMAN — Superman → Supergirl → Man of Tomorrow
  {
    sourceId: 5022, // Superman (32)
    targetId: 5046, // Supergirl: Woman of Tomorrow (46)
    bridges: []
  },
  {
    sourceId: 5046, // Supergirl: Woman of Tomorrow (46)
    targetId: 5049, // Superman: Man of Tomorrow (49)
    bridges: [
      { id: 5047, note: 'Clayface — expands the DCU\'s Gotham underworld while Superman and Supergirl\'s cosmic saga unfolds' }
    ]
  },

  // ── ARROW — S1 → S2 → S3 → S4
  {
    sourceId: 5033, // Arrow S1 (33)
    targetId: 5034, // Arrow S2 (34)
    bridges: []
  },
  {
    sourceId: 5034, // Arrow S2 (34)
    targetId: 5036, // Arrow S3 (36)
    bridges: [
      { id: 5035, note: 'The Flash S1 — introduces Barry Allen, metahumans, and STAR Labs; major crossover events connect Starling and Central City' }
    ]
  },
  {
    sourceId: 5036, // Arrow S3 (36)
    targetId: 5038, // Arrow S4 (38)
    bridges: [
      { id: 5037, note: 'The Flash S2 — introduces the multiverse, Zoom, and further crossovers that shape Oliver Queen\'s world' }
    ]
  },

  // ── FLASH (CW) — S1 → S2
  {
    sourceId: 5035, // The Flash S1 (35)
    targetId: 5037, // The Flash S2 (37)
    bridges: [
      { id: 5036, note: 'Arrow S3 — the League of Assassins arc and major crossovers that impact Team Flash and Central City' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // X-MEN UNIVERSE BRIDGES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── ORIGINAL X-MEN — X-Men → X2 → The Last Stand
  {
    sourceId: 6001, // X-Men (1)
    targetId: 6002, // X2: X-Men United (2)
    bridges: []
  },
  {
    sourceId: 6002, // X2: X-Men United (2)
    targetId: 6003, // The Last Stand (3)
    bridges: []
  },

  // ── WOLVERINE SAGA — Origins → The Wolverine → Logan
  {
    sourceId: 6004, // X-Men Origins: Wolverine (4)
    targetId: 6006, // The Wolverine (6)
    bridges: [
      { id: 6005, note: 'X-Men: First Class — reboots the timeline in the 1960s, establishing the young Xavier/Magneto dynamic that echoes Wolverine\'s mentor figures' }
    ]
  },
  {
    sourceId: 6006, // The Wolverine (6)
    targetId: 6010, // Logan (10)
    bridges: [
      { id: 6007, note: 'Days of Future Past — the time-altering events reset the timeline, directly affecting Wolverine\'s future and setting up the dystopian Logan era' },
      { id: 6008, note: 'Deadpool — introduces the irreverent mutant world that exists alongside Wolverine\'s journey' },
      { id: 6009, note: 'X-Men: Apocalypse — the ancient mutant\'s awakening reshapes the world Wolverine will inhabit in his final chapter' }
    ]
  },

  // ── FIRST CLASS ERA — First Class → DOFP → Apocalypse → Dark Phoenix
  {
    sourceId: 6005, // First Class (5)
    targetId: 6007, // Days of Future Past (7)
    bridges: [
      { id: 6006, note: 'The Wolverine — Logan\'s confrontation with mortality in Japan foreshadows his crucial role as the time-traveler in DOFP' }
    ]
  },
  {
    sourceId: 6007, // Days of Future Past (7)
    targetId: 6009, // Apocalypse (9)
    bridges: [
      { id: 6008, note: 'Deadpool — expands the post-DOFP mutant landscape before the ancient Apocalypse awakens' }
    ]
  },
  {
    sourceId: 6009, // Apocalypse (9)
    targetId: 6012, // Dark Phoenix (12)
    bridges: [
      { id: 6010, note: 'Logan — the tragic future awaiting mutantkind echoes the darkness Jean Grey carries within' },
      { id: 6011, note: 'Deadpool 2 — the X-Force and time-travel shenanigans expand the chaotic mutant world before Dark Phoenix\'s cosmic finale' }
    ]
  },

  // ── DEADPOOL CYCLE — Deadpool → Deadpool 2
  {
    sourceId: 6008, // Deadpool (8)
    targetId: 6011, // Deadpool 2 (11)
    bridges: [
      { id: 6009, note: 'X-Men: Apocalypse — the world-ending mutant threat raises the stakes before Wade forms X-Force' },
      { id: 6010, note: 'Logan — Wolverine\'s final mission and the emergence of new mutant children reshapes the world Deadpool navigates' }
    ]
  },

  // ── LEGION — S1 → S2 → S3
  {
    sourceId: 6014, // Legion S1 (14)
    targetId: 6015, // Legion S2 (15)
    bridges: []
  },
  {
    sourceId: 6015, // Legion S2 (15)
    targetId: 6016, // Legion S3 (16)
    bridges: []
  },

  // ── THE GIFTED — S1 → S2
  {
    sourceId: 6017, // The Gifted S1 (17)
    targetId: 6018, // The Gifted S2 (18)
    bridges: []
  },

  // ── X-MEN '97 — S1 → S2
  {
    sourceId: 6019, // X-Men '97 S1 (19)
    targetId: 6020, // X-Men '97 S2 (20)
    bridges: []
  }
];
