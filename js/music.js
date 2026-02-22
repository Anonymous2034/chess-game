// Classical music player for chess matches
// Uses public domain classical music from Wikimedia Commons

export const PLAYLIST = [
  {
    id: "bach-cello-1",
    title: "Cello Suite No. 1 — Prelude",
    composer: "J.S. Bach",
    duration: "2:38",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Bach_-_Cello_Suite_no._1_in_G_major%2C_BWV_1007_-_I._Pr%C3%A9lude.ogg"
  },
  {
    id: "bach-cello-5",
    title: "Cello Suite No. 5 — Prelude",
    composer: "J.S. Bach",
    duration: "5:50",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Bach_-_Cello_Suite_No._5_-_1._Prelude.ogg"
  },
  {
    id: "bach-air",
    title: "Air on the G String",
    composer: "J.S. Bach",
    duration: "5:22",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1e/Air_%28Bach%29.ogg"
  },
  {
    id: "bach-english-3-gigue",
    title: "English Suite No. 3 — Gigue",
    composer: "J.S. Bach",
    duration: "3:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Johann_Sebastian_Bach_-_English_Suite_No._3_in_G_minor_-_Gigue.ogg"
  },
  {
    id: "bach-english-3-sarabande",
    title: "English Suite No. 3 — Sarabande",
    composer: "J.S. Bach",
    duration: "4:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Johann_Sebastian_Bach_-_English_Suite_No._3_in_G_minor_-_Sarabande.ogg"
  },
  {
    id: "bach-english-3-allemande",
    title: "English Suite No. 3 — Allemande",
    composer: "J.S. Bach",
    duration: "4:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Johann_Sebastian_Bach_-_English_Suite_No._3_in_G_minor_-_Allemande.ogg"
  },
  {
    id: "bach-violin-oboe-adagio",
    title: "Concerto for Violin and Oboe — Adagio",
    composer: "J.S. Bach",
    duration: "5:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/71/Johann_Sebastian_Bach_-_Concerto_for_Violin_and_Oboe_in_C_minor_-_2._Adagio.ogg"
  },
  {
    id: "bach-bwv998-allegro",
    title: "Prelude, Fugue and Allegro BWV 998 — Allegro",
    composer: "J.S. Bach",
    duration: "3:20",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/67/Johann_Sebastian_Bach_-_BWV_998_-_III_Allegro.ogg"
  },
  {
    id: "bach-brahms-chaconne",
    title: "Chaconne (arr. Brahms)",
    composer: "J.S. Bach",
    duration: "13:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Bach_Brahms_Chaconne.ogg"
  },
  {
    id: "beethoven-moonlight-1",
    title: "Moonlight Sonata — 1st Movement",
    composer: "Ludwig van Beethoven",
    duration: "6:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/eb/Beethoven_Moonlight_1st_movement.ogg"
  },
  {
    id: "beethoven-minuet-g",
    title: "Minuet in G",
    composer: "Ludwig van Beethoven",
    duration: "2:24",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/db/Minuet_in_G_%28Beethoven%29%2C_piano.ogg"
  },
  {
    id: "beethoven-concerto3-2",
    title: "Piano Concerto No. 3 — 2nd Movement",
    composer: "Ludwig van Beethoven",
    duration: "9:23",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/10/Beethoven_piano_concerto_3_-_2nd_mvt.ogg"
  },
  {
    id: "beethoven-concerto3-3",
    title: "Piano Concerto No. 3 — 3rd Movement",
    composer: "Ludwig van Beethoven",
    duration: "9:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/db/Beethoven_piano_concerto_3_-_3rd_mvt.ogg"
  },
  {
    id: "beethoven-sonata32-1",
    title: "Piano Sonata No. 32, Op. 111 — 1st Movement",
    composer: "Ludwig van Beethoven",
    duration: "9:08",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/95/Beethoven_-_Piano_sonata_in_C_minor_%28opus_111%29%2C_movement_1.ogg"
  },
  {
    id: "beethoven-sonata28-3",
    title: "Piano Sonata No. 28, Op. 101 — 3rd Movement",
    composer: "Ludwig van Beethoven",
    duration: "3:49",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/95/Beethoven_-_Piano_Sonata_No._28_in_A_Major%2C_Op._101_-_III._Langsam_und_sehnsuchtsvoll.ogg"
  },
  {
    id: "beethoven-symphony5-1",
    title: "Symphony No. 5 — 1st Movement",
    composer: "Ludwig van Beethoven",
    duration: "8:20",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Ludwig_van_Beethoven_-_symphony_no._5_in_c_minor%2C_op._67_-_i._allegro_con_brio.ogg"
  },
  {
    id: "beethoven-symphony5-3",
    title: "Symphony No. 5 — 3rd Movement",
    composer: "Ludwig van Beethoven",
    duration: "5:36",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Ludwig_van_Beethoven_-_symphony_no._5_in_c_minor%2C_op._67_-_iii._allegro.ogg"
  },
  {
    id: "beethoven-symphony5-4",
    title: "Symphony No. 5 — 4th Movement",
    composer: "Ludwig van Beethoven",
    duration: "11:47",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/47/Ludwig_van_Beethoven_-_symphony_no._5_in_c_minor%2C_op._67_-_iv._allegro.ogg"
  },
  {
    id: "beethoven-symphony6-1",
    title: "Symphony No. 6 'Pastoral' — 1st Movement",
    composer: "Ludwig van Beethoven",
    duration: "9:26",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Ludwig_van_Beethoven_-_symphony_no._6_in_f_major_%27pastoral%27%2C_op._68_-_i._allegro_non_troppo.ogg"
  },
  {
    id: "beethoven-symphony4-1",
    title: "Symphony No. 4 — 1st Movement",
    composer: "Ludwig van Beethoven",
    duration: "9:43",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Ludwig_van_Beethoven_-_symphony_no._4_in_b_flat_major%2C_op._60_-_i._adagio_-_allegro_vivace.ogg"
  },
  {
    id: "beethoven-symphony5-1-alt",
    title: "Symphonie 5 — Allegro con brio (alt.)",
    composer: "Ludwig van Beethoven",
    duration: "7:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Ludwig_van_Beethoven_-_Symphonie_5_c-moll_-_1._Allegro_con_brio.ogg"
  },
  {
    id: "chopin-nocturne-2",
    title: "Nocturne Op. 9 No. 2",
    composer: "Frédéric Chopin",
    duration: "4:33",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Chopin_Nocturne_Op_9_No_2.ogg"
  },
  {
    id: "chopin-raindrop",
    title: "Prelude Op. 28 No. 15 \"Raindrop\"",
    composer: "Frédéric Chopin",
    duration: "5:28",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Chopin_Prelude_Op_28_N_15_Giorgi_Latsabidze_performs.ogg"
  },
  {
    id: "chopin-funeral-march",
    title: "Piano Sonata No. 2 — Marche Funèbre",
    composer: "Frédéric Chopin",
    duration: "9:49",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Frederic_Chopin_Piano_Sonata_No.2_in_B_flat_minor_Op35_-_III_Marche_Funebre.ogg"
  },
  {
    id: "chopin-sonata2-scherzo",
    title: "Piano Sonata No. 2 — Scherzo",
    composer: "Frédéric Chopin",
    duration: "6:35",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f7/Frederic_Chopin_Piano_Sonata_No.2_in_B_flat_minor_Op35_-_II_Scherzo.ogg"
  },
  {
    id: "chopin-etude-op25-12",
    title: "Étude Op. 25 No. 12 in C minor",
    composer: "Frédéric Chopin",
    duration: "2:33",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Frederic_Chopin_-_Opus_25_-_Twelve_Grand_Etudes_-_c_minor.ogg"
  },
  {
    id: "chopin-etude-op25-1",
    title: "Étude Op. 25 No. 1 \"Aeolian Harp\"",
    composer: "Frédéric Chopin",
    duration: "2:20",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/44/Chopin_op25_No_1.ogg"
  },
  {
    id: "chopin-etude-op10-1",
    title: "Étude Op. 10 No. 1",
    composer: "Frédéric Chopin",
    duration: "2:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/8c/Chopin_op10_No_1.ogg"
  },
  {
    id: "chopin-berceuse",
    title: "Berceuse, Op. 57",
    composer: "Frédéric Chopin",
    duration: "5:13",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/44/1_Chopin%2C_Berceuse_%28piano-Christine_Hartley%29.ogg"
  },
  {
    id: "chopin-rondo-op14",
    title: "Rondo for Piano and Orchestra, Op. 14",
    composer: "Frédéric Chopin",
    duration: "10:54",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/be/Frederic_Chopin_-_Rondo_for_piano_and_orchestra%2C_Op._14.ogg"
  },
  {
    id: "chopin-mazurka-op7-1",
    title: "Mazurka in B-flat major, Op. 7 No. 1",
    composer: "Frédéric Chopin",
    duration: "2:24",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/46/Chopin_-_Mazurka_in_B-flat_major%2C_Op._7_no._1.ogg"
  },
  {
    id: "chopin-mazurka-op17-4",
    title: "Mazurka No. 4 in A minor, Op. 17",
    composer: "Frédéric Chopin",
    duration: "5:35",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Frederic_Chopin_-_mazurka_no._4_in_a_minor%2C_op._17.ogg"
  },
  {
    id: "chopin-mazurka-op68-4",
    title: "Mazurka in F minor, Op. 68 No. 4",
    composer: "Frédéric Chopin",
    duration: "2:11",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Chopin_-_Mazurka_in_F_minor%2C_Op._68_no._4.ogg"
  },
  {
    id: "chopin-waltz-amin",
    title: "Waltz in A minor, B 150",
    composer: "Frédéric Chopin",
    duration: "2:11",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Chopin_-_Waltz_in_A_minor%2C_B_150.ogg"
  },
  {
    id: "chopin-concerto1-2",
    title: "Piano Concerto No. 1 — 2nd Movement (arr. string quartet)",
    composer: "Frédéric Chopin",
    duration: "9:40",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a4/Chopin_-_Piano_Concerto_no._1%2C_Op._11_%28string_quartet%29-2.ogg"
  },
  {
    id: "debussy-clair",
    title: "Clair de Lune",
    composer: "Claude Debussy",
    duration: "5:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/be/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg"
  },
  {
    id: "debussy-syrinx",
    title: "Syrinx",
    composer: "Claude Debussy",
    duration: "3:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Debussy_-_Syrinx.ogg"
  },
  {
    id: "debussy-la-plus",
    title: "La Plus que Lente",
    composer: "Claude Debussy",
    duration: "4:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Debussy_La_Plus_que_Lente.ogg"
  },
  {
    id: "debussy-arabesque-1",
    title: "Première Arabesque",
    composer: "Claude Debussy",
    duration: "4:53",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Claude_Debussy_-_Premi%C3%A8re_Arabesque_-_Patrizia_Prati.ogg"
  },
  {
    id: "debussy-arabesque-2",
    title: "Deuxième Arabesque",
    composer: "Claude Debussy",
    duration: "4:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/89/Claude_Debussy_-_Deuxi%C3%A8me_Arabesque_-_Patrizia_Prati.ogg"
  },
  {
    id: "debussy-prelude2-1",
    title: "Préludes Book 2 — Brouillards",
    composer: "Claude Debussy",
    duration: "2:59",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Debussy-_Preludes%2C_Book_2-_I._Brouillards.oga"
  },
  {
    id: "debussy-prelude2-2",
    title: "Préludes Book 2 — Feuilles Mortes",
    composer: "Claude Debussy",
    duration: "3:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Debussy-_Preludes%2C_Book_2-_II._Feuilles_Mortes.oga"
  },
  {
    id: "debussy-prelude2-3",
    title: "Préludes Book 2 — La Puerta Del Vino",
    composer: "Claude Debussy",
    duration: "3:12",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Debussy-_Preludes%2C_Book_2-_III._La_Puerta_Del_Vino.oga"
  },
  {
    id: "debussy-prelude2-4",
    title: "Préludes Book 2 — Les Fées Sont D'Exquises Danseuses",
    composer: "Claude Debussy",
    duration: "2:37",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Debussy-_Preludes%2C_Book_2-_IV._%27Les_Fees_Sont_D%27Exquises_Danseuses%27.oga"
  },
  {
    id: "debussy-prelude2-5",
    title: "Préludes Book 2 — Bruyères",
    composer: "Claude Debussy",
    duration: "2:20",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/25/Debussy-_Preludes%2C_Book_2-_V._Bruyeres._Giorgi_Latsabidze.oga"
  },
  {
    id: "debussy-prelude2-8",
    title: "Préludes Book 2 — Ondine",
    composer: "Claude Debussy",
    duration: "3:43",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/39/Debussy-_Pr%C3%A9ludes%2C_Book_2-_VIII._Ondine.oga"
  },
  {
    id: "debussy-prelude2-10",
    title: "Préludes Book 2 — Canope",
    composer: "Claude Debussy",
    duration: "2:47",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Debussy-_Preludes%2C_Book_2-_X._Canope.oga"
  },
  {
    id: "debussy-prelude2-12",
    title: "Préludes Book 2 — Feux D'Artifice",
    composer: "Claude Debussy",
    duration: "4:48",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Debussy-_Preludes%2C_Book_2-_XII._Feux_D%27Artifice.oga"
  },
  {
    id: "mozart-eine-kleine-1",
    title: "Eine kleine Nachtmusik — 1st Movement",
    composer: "Wolfgang Amadeus Mozart",
    duration: "5:48",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/24/Mozart_-_Eine_kleine_Nachtmusik_-_1._Allegro.ogg"
  },
  {
    id: "mozart-quintet-winds-3",
    title: "Quintet for Piano and Winds — Allegretto",
    composer: "Wolfgang Amadeus Mozart",
    duration: "5:42",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Mozart_-_Quintet_for_Piano_and_Winds_-_3._Allegretto.ogg"
  },
  {
    id: "mozart-quintet-winds-2",
    title: "Quintet for Piano and Winds — Larghetto",
    composer: "Wolfgang Amadeus Mozart",
    duration: "8:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Mozart_-_Quintet_for_Piano_and_Winds_-_2._Larghetto.ogg"
  },
  {
    id: "mozart-sonata13-1",
    title: "Piano Sonata No. 13, K.333 — Allegro",
    composer: "Wolfgang Amadeus Mozart",
    duration: "5:33",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d1/Wolfgang_Amadeus_Mozart_-_sonata_no._13_in_b_flat_major%2C_k.333_-_i._allegro.ogg"
  },
  {
    id: "mozart-sonata-amin-1",
    title: "Piano Sonata in A minor — 1st Movement",
    composer: "Wolfgang Amadeus Mozart",
    duration: "6:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/67/Mozart_Piano_Sonata_Amin1.ogg"
  },
  {
    id: "mozart-sonata-amin-3",
    title: "Piano Sonata in A minor — 3rd Movement",
    composer: "Wolfgang Amadeus Mozart",
    duration: "3:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/98/Mozart_Piano_Sonata_Amin3.ogg"
  },
  {
    id: "mozart-k448",
    title: "Sonata for Two Pianos, K.448",
    composer: "Wolfgang Amadeus Mozart",
    duration: "7:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Mozart_K448.ogg"
  },
  {
    id: "mozart-symphony40-3",
    title: "Symphony No. 40 — Menuetto",
    composer: "Wolfgang Amadeus Mozart",
    duration: "4:32",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/29/Wolfgang_Amadeus_Mozart_-_Symphony_40_g-moll_-_3._Menuetto%2C_Allegretto-Trio.ogg"
  },
  {
    id: "mozart-jupiter-1",
    title: "Symphony No. 41 'Jupiter' — 1st Movement",
    composer: "Wolfgang Amadeus Mozart",
    duration: "8:05",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/26/Wolfgang_Amadeus_Mozart_-_Symphony_No._41_1st_Movement_%28Jupiter%29%2C_K.551.ogg"
  },
  {
    id: "mozart-jupiter-2",
    title: "Symphony No. 41 'Jupiter' — 2nd Movement",
    composer: "Wolfgang Amadeus Mozart",
    duration: "8:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d4/Wolfgang_Amadeus_Mozart_-_Symphony_No._41_2nd_Movement_%28Jupiter%29%2C_K.551.ogg"
  },
  {
    id: "mozart-jupiter-3",
    title: "Symphony No. 41 'Jupiter' — 3rd Movement",
    composer: "Wolfgang Amadeus Mozart",
    duration: "5:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Wolfgang_Amadeus_Mozart_-_Symphony_No._41_3rd_Movement_%28Jupiter%29%2C_K.551.ogg"
  },
  {
    id: "mozart-jupiter-4",
    title: "Symphony No. 41 'Jupiter' — 4th Movement",
    composer: "Wolfgang Amadeus Mozart",
    duration: "9:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Wolfgang_Amadeus_Mozart_-_Symphony_No._41_4th_Movement_%28Jupiter%29%2C_K.551.ogg"
  },
  {
    id: "satie-gymno-1",
    title: "Gymnopédie No. 1",
    composer: "Erik Satie",
    duration: "3:09",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/90/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg"
  },
  {
    id: "satie-gnossienne-1",
    title: "Gnossienne No. 1",
    composer: "Erik Satie",
    duration: "3:40",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/91/Satie_-_Gnossienne_1.ogg"
  },
  {
    id: "satie-gnossienne-1-alt",
    title: "Gnossienne No. 1 (alt. performance)",
    composer: "Erik Satie",
    duration: "4:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Erik_Satie_-_Gnossienne_no_1.ogg"
  },
  {
    id: "satie-gnossienne-3",
    title: "Gnossienne No. 3",
    composer: "Erik Satie",
    duration: "3:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/10/Gnossienne_3_%28Satie%29.ogg"
  },
  {
    id: "satie-gnossienne-4",
    title: "Gnossienne No. 4",
    composer: "Erik Satie",
    duration: "2:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e9/Gnossienne_4_%28Satie%29.ogg"
  },
  {
    id: "satie-gnossienne-5",
    title: "Gnossienne No. 5",
    composer: "Erik Satie",
    duration: "3:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/07/Gnossienne_5_%28Satie%29.ogg"
  },
  {
    id: "satie-gnossienne-6",
    title: "Gnossienne No. 6",
    composer: "Erik Satie",
    duration: "2:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Gnossienne_6_%28Satie%29.ogg"
  },
  {
    id: "tchaikovsky-1812",
    title: "1812 Overture",
    composer: "Pyotr Tchaikovsky",
    duration: "16:39",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/04/Pyotr_Ilyich_Tchaikovsky_-_1812_overture.ogg"
  },
  {
    id: "tchaikovsky-12pieces-op40",
    title: "Twelve Pieces for Piano, Op. 40 (extract)",
    composer: "Pyotr Tchaikovsky",
    duration: "5:40",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2d/Tchaikovsky%2C_Pyotr_Ilyich_-_Twelve_Pieces_for_piano%2C_Opus_40_%28extract%29.ogg"
  },
  {
    id: "tchaikovsky-seasons-jan",
    title: "The Seasons — January: By the Fireside",
    composer: "Pyotr Tchaikovsky",
    duration: "5:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Tchaikovsky_the_Seasons_January.ogg"
  },
  {
    id: "tchaikovsky-seasons-feb",
    title: "The Seasons — February: Carnival",
    composer: "Pyotr Tchaikovsky",
    duration: "2:44",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Tchaikovsky_the_Seasons_February.ogg"
  },
  {
    id: "tchaikovsky-seasons-mar",
    title: "The Seasons — March: Song of the Lark",
    composer: "Pyotr Tchaikovsky",
    duration: "2:15",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Tchaikovsky_the_Seasons_March.ogg"
  },
  {
    id: "tchaikovsky-seasons-apr",
    title: "The Seasons — April: Snowdrop",
    composer: "Pyotr Tchaikovsky",
    duration: "2:09",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/38/Tchaikovsky_the_Seasons_April.ogg"
  },
  {
    id: "tchaikovsky-seasons-may",
    title: "The Seasons — May: White Nights",
    composer: "Pyotr Tchaikovsky",
    duration: "3:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Tchaikovsky_the_Seasons_May.ogg"
  },
  {
    id: "tchaikovsky-seasons-jun",
    title: "The Seasons — June: Barcarolle",
    composer: "Pyotr Tchaikovsky",
    duration: "3:51",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/54/Tchaikovsky_the_Seasons_June.ogg"
  },
  {
    id: "tchaikovsky-seasons-jul",
    title: "The Seasons — July: Song of the Reaper",
    composer: "Pyotr Tchaikovsky",
    duration: "1:53",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/80/Tchaikovsky_the_Seasons_July.ogg"
  },
  {
    id: "tchaikovsky-seasons-aug",
    title: "The Seasons — August: Harvest",
    composer: "Pyotr Tchaikovsky",
    duration: "3:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Tchaikovsky_the_Seasons_August.ogg"
  },
  {
    id: "tchaikovsky-seasons-sep",
    title: "The Seasons — September: The Hunt",
    composer: "Pyotr Tchaikovsky",
    duration: "2:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Tchaikovsky_the_Seasons_September.ogg"
  },
  {
    id: "tchaikovsky-seasons-oct",
    title: "The Seasons — October: Autumn Song",
    composer: "Pyotr Tchaikovsky",
    duration: "4:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Tchaikovsky_the_Seasons_October.ogg"
  },
  {
    id: "tchaikovsky-seasons-nov",
    title: "The Seasons — November: Troika",
    composer: "Pyotr Tchaikovsky",
    duration: "3:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Tchaikovsky_the_Seasons_November.ogg"
  },
  {
    id: "tchaikovsky-seasons-dec",
    title: "The Seasons — December: Christmas",
    composer: "Pyotr Tchaikovsky",
    duration: "3:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a4/Tchaikovsky_the_Seasons_December.ogg"
  },
  {
    id: "vivaldi-spring-1",
    title: "Four Seasons: Spring — Allegro",
    composer: "Antonio Vivaldi",
    duration: "3:35",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Vivaldi_-_Four_Seasons_1_Spring_mvt_1_Allegro_-_John_Harrison_violin.oga"
  },
  {
    id: "vivaldi-spring-2",
    title: "Four Seasons: Spring — Largo",
    composer: "Antonio Vivaldi",
    duration: "2:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Vivaldi_-_Four_Seasons_1_Spring_mvt_2_Largo_-_John_Harrison_violin.oga"
  },
  {
    id: "vivaldi-summer-2",
    title: "Four Seasons: Summer — Adagio",
    composer: "Antonio Vivaldi",
    duration: "2:15",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/55/Vivaldi_-_Four_Seasons_2_Summer_mvt_2_Adagio_-_John_Harrison_violin.oga"
  },
  {
    id: "vivaldi-summer-3",
    title: "Four Seasons: Summer — Presto",
    composer: "Antonio Vivaldi",
    duration: "2:45",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Vivaldi_-_Four_Seasons_2_Summer_mvt_3_Presto_-_John_Harrison_violin.oga"
  },
  {
    id: "vivaldi-autumn-2",
    title: "Four Seasons: Autumn — Adagio molto",
    composer: "Antonio Vivaldi",
    duration: "2:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/8b/Vivaldi_-_Four_Seasons_3_Autumn_mvt_2_Adagio_molto_-_John_Harrison_violin.oga"
  },
  {
    id: "vivaldi-autumn-3",
    title: "Four Seasons: Autumn — Allegro",
    composer: "Antonio Vivaldi",
    duration: "3:15",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Vivaldi_-_Four_Seasons_3_Autumn_mvt_3_Allegro_-_John_Harrison_violin.oga"
  },
  {
    id: "vivaldi-winter-1",
    title: "Four Seasons: Winter — Allegro non molto",
    composer: "Antonio Vivaldi",
    duration: "3:29",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Vivaldi_-_Four_Seasons_4_Winter_mvt_1_Allegro_non_molto_-_John_Harrison_violin.oga"
  },
  {
    id: "vivaldi-winter-2",
    title: "Four Seasons: Winter — Largo",
    composer: "Antonio Vivaldi",
    duration: "1:45",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b1/11_-_Vivaldi_Winter_mvt_2_Largo_-_John_Harrison_violin.ogg"
  },
  {
    id: "vivaldi-2violins-allegro",
    title: "Concerto for Two Violins, Op. 3 No. 8 — Allegro",
    composer: "Antonio Vivaldi",
    duration: "3:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/af/Vivaldi_-_Concerto_for_Two_Violins_in_A_minor%2C_Op._3%2C_No._8_-_1._Allegro.ogg"
  },
  {
    id: "vivaldi-2violins-larghetto",
    title: "Concerto for Two Violins, Op. 3 No. 8 — Larghetto",
    composer: "Antonio Vivaldi",
    duration: "3:53",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/df/Vivaldi_-_Concerto_for_Two_Violins_in_A_minor%2C_Op._3%2C_No._8_-_2._Larghetto_e_spiritoso.ogg"
  },
  {
    id: "vivaldi-2violins-allegro-3",
    title: "Concerto for Two Violins, Op. 3 No. 8 — Allegro (3rd mvt)",
    composer: "Antonio Vivaldi",
    duration: "2:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/c0/Vivaldi_-_Concerto_for_Two_Violins_in_A_minor%2C_Op._3%2C_No._8_-_3._Allegro.ogg"
  },
  {
    id: "vivaldi-oboe-andante",
    title: "Concerto for Oboe in C major — Andante",
    composer: "Antonio Vivaldi",
    duration: "3:45",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/12/Vivaldi_-_Concerto_for_Oboe_and_Orchestra_in_C_major_F7-6_-_2._Andante.ogg"
  },
  {
    id: "schubert-impromptu-bflat",
    title: "Impromptu in B-flat",
    composer: "Franz Schubert",
    duration: "12:16",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/90/Schubert-_Impromptu_B-flat.ogg"
  },
  {
    id: "schubert-impromptu-1-cmin",
    title: "Impromptu Op. 90 No. 1 in C minor",
    composer: "Franz Schubert",
    duration: "9:41",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/55/Schubert_Impromptu_1_Cmin.ogg"
  },
  {
    id: "schubert-impromptu-2-eflat",
    title: "Impromptu No. 2 in E-flat major, D.899",
    composer: "Franz Schubert",
    duration: "4:22",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/59/Schubert%27s_Impromptu_no._2_in_E-flat_major%2C_D.899_-_Chiara_Bertoglio.ogg"
  },
  {
    id: "schubert-impromptu-3-gflat",
    title: "Impromptu No. 3 in G-flat major, D.899",
    composer: "Franz Schubert",
    duration: "5:58",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/31/Schubert%27s_Impromptu_no._3_in_G-flat_major%2C_D.899_-_Chiara_Bertoglio.ogg"
  },
  {
    id: "schubert-impromptus-d899-4",
    title: "Impromptu D.899 No. 4",
    composer: "Franz Schubert",
    duration: "7:05",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/df/Schubert_Impromptus_D899_No_4.ogg"
  },
  {
    id: "schubert-impromptu-d946-3",
    title: "Impromptu D.946 No. 3 in C major",
    composer: "Franz Schubert",
    duration: "5:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Franz_Schubert%2C_Impromptu_Opus_post._D_946_-_No._3_in_C_major_%28Allegro%29.ogg"
  },
  {
    id: "schubert-ave-maria",
    title: "Ave Maria",
    composer: "Franz Schubert",
    duration: "5:26",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Free_Tim_-_Schuberts_Ave_Maria.ogg"
  },
  {
    id: "schubert-sonata-1",
    title: "Piano Sonata — Moderato (1st mvt)",
    composer: "Franz Schubert",
    duration: "10:55",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/bd/Schubert_-_Piano_Sonatas_-_1_Moderato.ogg"
  },
  {
    id: "schubert-sonata-2",
    title: "Piano Sonata — Andante (2nd mvt)",
    composer: "Franz Schubert",
    duration: "9:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/77/Schubert_-_Piano_Sonatas_-_2_Andante.ogg"
  },
  {
    id: "schubert-sonata-8",
    title: "Piano Sonata — Allegro (8th mvt)",
    composer: "Franz Schubert",
    duration: "8:15",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Schubert_-_Piano_Sonatas_-_8_Allegro.ogg"
  },
  {
    id: "schumann-fantasie-3",
    title: "Fantasie in C major — Lento sostenuto",
    composer: "Robert Schumann",
    duration: "10:56",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Robert_Schumann_-_Fantasie_-_Lento_sostenuto_Sempre_piano.ogg"
  },
  {
    id: "schumann-kinderszenen-1",
    title: "Scenes from Childhood — Of Foreign Lands and Peoples",
    composer: "Robert Schumann",
    duration: "1:52",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_i._of_foreign_lands_and_peoples.ogg"
  },
  {
    id: "schumann-kinderszenen-2",
    title: "Scenes from Childhood — A Curious Story",
    composer: "Robert Schumann",
    duration: "1:37",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2d/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_ii._a_curious_story.ogg"
  },
  {
    id: "schumann-kinderszenen-3",
    title: "Scenes from Childhood — Blind Man's Buff",
    composer: "Robert Schumann",
    duration: "0:37",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_iii._blind_man%27s_buff.ogg"
  },
  {
    id: "schumann-kinderszenen-4",
    title: "Scenes from Childhood — Pleading Child",
    composer: "Robert Schumann",
    duration: "1:23",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/49/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_iv._pleading_child.ogg"
  },
  {
    id: "schumann-kinderszenen-5",
    title: "Scenes from Childhood — Happiness",
    composer: "Robert Schumann",
    duration: "1:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/04/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_v._happiness.ogg"
  },
  {
    id: "schumann-kinderszenen-7",
    title: "Scenes from Childhood — Dreaming (Träumerei)",
    composer: "Robert Schumann",
    duration: "2:45",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/06/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_vii._dreaming.ogg"
  },
  {
    id: "schumann-concerto-1",
    title: "Piano Concerto in A minor — I. Allegro",
    composer: "Robert Schumann",
    duration: "13:54",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Schumann_-_Piano_Concerto_in_A_minor_Op.54_-_I._Allegro.ogg"
  },
  {
    id: "schumann-sonata1-1",
    title: "Piano Sonata No. 1, Op. 11 — Introduzione",
    composer: "Robert Schumann",
    duration: "12:06",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Schumann%3B_Piano_Sonata_No._1_In_F_Sharp_Minor_Op.11-_1.Introduzione.ogg"
  },
  {
    id: "liszt-consolation-3",
    title: "Consolation No. 3 — Lento placido",
    composer: "Franz Liszt",
    duration: "4:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f5/Franz_Liszt_-_Consolation_No._3%2C_Lento_placido.ogg"
  },
  {
    id: "liszt-concerto1-1",
    title: "Piano Concerto No. 1 — 1st Movement",
    composer: "Franz Liszt",
    duration: "5:46",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Liszt_Piano_Concerto_1_-_mvt_1.ogg"
  },
  {
    id: "liszt-concerto1-2",
    title: "Piano Concerto No. 1 — 2nd Movement",
    composer: "Franz Liszt",
    duration: "5:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/8b/Liszt_Piano_Concerto_1_-_mvt_2.ogg"
  },
  {
    id: "liszt-concerto1-3",
    title: "Piano Concerto No. 1 — 3rd Movement",
    composer: "Franz Liszt",
    duration: "4:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/56/Liszt_Piano_Concerto_1_-_mvt_3.ogg"
  },
  {
    id: "liszt-concerto1-4",
    title: "Piano Concerto No. 1 — 4th Movement",
    composer: "Franz Liszt",
    duration: "4:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/26/Liszt%3B_piano_concerto_No._1%2C_4._allegro_Marziale_Animato.ogg"
  },
  {
    id: "liszt-concerto1-1-alt",
    title: "Piano Concerto No. 1 — 1st Movement (alt.)",
    composer: "Franz Liszt",
    duration: "10:37",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Franz_Liszt_-_1st_piano_concerto%2C_1st_movement.ogg"
  },
  {
    id: "liszt-concerto1-2-alt",
    title: "Piano Concerto No. 1 — 2nd Movement (alt.)",
    composer: "Franz Liszt",
    duration: "7:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/93/Liszt_1st_concerto2.ogg"
  },
  {
    id: "liszt-la-campanella",
    title: "La Campanella",
    composer: "Franz Liszt",
    duration: "5:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Liszt-La_Campanella-Greiss.ogg"
  },
  {
    id: "liszt-hungarian-10",
    title: "Hungarian Rhapsody No. 10",
    composer: "Franz Liszt",
    duration: "5:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/60/Liszt_Hungarian_Rhapsody_No_10.ogg"
  },
  {
    id: "liszt-totentanz",
    title: "Totentanz",
    composer: "Franz Liszt",
    duration: "15:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/59/Liszt_Totentanz.ogg"
  },
  {
    id: "rachmaninoff-concerto2-1",
    title: "Piano Concerto No. 2 — I. Moderato",
    composer: "Sergei Rachmaninoff",
    duration: "10:54",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/63/Sergei_Rachmaninoff_-_piano_concerto_no._2_in_c_minor%2C_op._18_-_i._moderato.ogg"
  },
  {
    id: "rachmaninoff-concerto2-2",
    title: "Piano Concerto No. 2 — II. Adagio sostenuto",
    composer: "Sergei Rachmaninoff",
    duration: "11:04",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Sergei_Rachmaninoff_-_piano_concerto_no._2_in_c_minor%2C_op._18_-_ii._adagio_sostenuto.ogg"
  },
  {
    id: "rachmaninoff-concerto2-3",
    title: "Piano Concerto No. 2 — III. Allegro scherzando",
    composer: "Sergei Rachmaninoff",
    duration: "19:12",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/16/Sergei_Rachmaninoff_-_piano_concerto_no._2_in_c_minor%2C_op._18_-_iii._allegro_scherzando.ogg"
  },
  {
    id: "rachmaninoff-concerto1-2",
    title: "Piano Concerto No. 1 — 2nd Movement",
    composer: "Sergei Rachmaninoff",
    duration: "6:08",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/07/Sergei_Rachmaninoff_-_Concerto_1_in_F_sharp_minor%2C_2nd_movement.ogg"
  },
  {
    id: "rachmaninoff-concerto1-3",
    title: "Piano Concerto No. 1 — 3rd Movement",
    composer: "Sergei Rachmaninoff",
    duration: "8:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Sergei_Rachmaninoff_-_Concerto_1_in_F_sharp_minor%2C_3rd_movement.ogg"
  },
  {
    id: "rachmaninoff-prelude-csharp",
    title: "Prelude in C-sharp minor, Op. 3 (played by Rachmaninoff)",
    composer: "Sergei Rachmaninoff",
    duration: "3:48",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b9/Sergei_Rachmaninoff_performs_Rachmaninoff%27s_Prelude_in_C_sharp_minor%2C_Op._3.ogg"
  },
  {
    id: "rachmaninoff-vocalise",
    title: "Vocalise (arr. for Violin and Piano)",
    composer: "Sergei Rachmaninoff",
    duration: "4:26",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Rachmaninoff_-_Vocalise_transcribed_for_Violin_and_Piano.ogg"
  },
  {
    id: "rachmaninoff-etude-op39-5",
    title: "Études-Tableaux, Op. 39 — No. 5 in E-flat minor",
    composer: "Sergei Rachmaninoff",
    duration: "4:31",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/91/Sergei_Rachmaninoff_-_etudes_tableaux%2C_op._39_-_v._apassianato_in_e_flat_minor.ogg"
  },
  {
    id: "rachmaninoff-chopin-waltz",
    title: "Chopin Waltz in E-flat (performed by Rachmaninoff)",
    composer: "Sergei Rachmaninoff",
    duration: "4:38",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7f/Rachmaninoff_-_Chopin_Waltz_E_flat_major_-_Steinway_grand_piano.ogg"
  },
  {
    id: "strauss-blue-danube",
    title: "The Blue Danube (An der schönen blauen Donau)",
    composer: "Johann Strauss II",
    duration: "2:58",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/91/Strauss%2C_An_der_sch%C3%B6nen_blauen_Donau.ogg"
  },
  {
    id: "strauss-wiener-blut",
    title: "Wiener Blut, Op. 354",
    composer: "Johann Strauss II",
    duration: "2:58",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Johann_Strauss_-_Wiener_Blut_Op._354.ogg"
  },
  {
    id: "strauss-tales-vienna",
    title: "Tales from the Vienna Woods, Op. 325",
    composer: "Johann Strauss II",
    duration: "12:07",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/19/Johann_Strauss_-_G%27schichten_aus_dem_Wienerwald%2C_Op.325.ogg"
  },
  {
    id: "strauss-kunstlerleben",
    title: "Künstlerleben (Artist's Life)",
    composer: "Johann Strauss II",
    duration: "2:53",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Strauss%2C_K%C3%BCnstlerleben.ogg"
  },
  {
    id: "strauss-kaiserwalzer",
    title: "Emperor Waltz (Kaiserwalzer)",
    composer: "Johann Strauss II",
    duration: "3:01",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Strauss%2C_Kaiserwalzer.ogg"
  },
  {
    id: "strauss-rosen-aus-dem-suden",
    title: "Roses from the South (Rosen aus dem Süden)",
    composer: "Johann Strauss II",
    duration: "3:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/bd/Strauss%2C_Rosen_aus_dem_S%C3%BCden.ogg"
  },
  {
    id: "grieg-concerto-1",
    title: "Piano Concerto in A minor — 1st Movement",
    composer: "Edvard Grieg",
    duration: "12:44",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Edvard_Grieg_-_Concerto_in_A_minor%2C_1st_movement.ogg"
  },
  {
    id: "grieg-concerto-2",
    title: "Piano Concerto in A minor — 2nd Movement",
    composer: "Edvard Grieg",
    duration: "6:31",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/61/Edvard_Grieg_-_Concerto_in_A_minor%2C_2nd_movement.ogg"
  },
  {
    id: "grieg-concerto-3",
    title: "Piano Concerto in A minor — 3rd Movement",
    composer: "Edvard Grieg",
    duration: "10:16",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/85/Edvard_Grieg_-_Concerto_in_A_minor%2C_3rd_movement.ogg"
  },
  {
    id: "grieg-peer-gynt-anitra",
    title: "Peer Gynt Suite No. 1 — Anitra's Dance",
    composer: "Edvard Grieg",
    duration: "4:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/25/Grieg%2C_Peer_Gynt_Suite_No._1%2C_Op._46_-_III._Anitra%27s_Dance.ogg"
  },
  {
    id: "grieg-morning-mood",
    title: "Peer Gynt Suite No. 1 — Morning Mood",
    composer: "Edvard Grieg",
    duration: "3:44",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Henrik_Ibsen%2C_Edvard_Grieg_-_Morgenstemning_%28Morning_Mood%29.ogg"
  },
  {
    id: "grieg-morning-musopen",
    title: "Morning Mood (Musopen Orchestra)",
    composer: "Edvard Grieg",
    duration: "3:49",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Musopen_-_Morning.ogg"
  },
  {
    id: "grieg-mountain-king",
    title: "In the Hall of the Mountain King",
    composer: "Edvard Grieg",
    duration: "2:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/bb/Musopen_-_In_the_Hall_Of_The_Mountain_King.ogg"
  },
  {
    id: "grieg-lyric-kobold",
    title: "Lyric Pieces — Kobold",
    composer: "Edvard Grieg",
    duration: "1:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Grieg_Lyric_Pieces_Kobold.ogg"
  },
  {
    id: "grieg-lyric-voeglein",
    title: "Lyric Pieces — Vöglein (Little Bird)",
    composer: "Edvard Grieg",
    duration: "1:35",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Grieg_Lyric_Pieces_Voeglein.ogg"
  },
  {
    id: "handel-fireworks-overture",
    title: "Music for the Royal Fireworks — Overture",
    composer: "Georg Friedrich Händel",
    duration: "8:26",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/bf/George_Frideric_Handel_-_Music_for_the_Royal_Fireworks_1_%28Overture%29_The_sound_quality_is_better_music.ogg"
  },
  {
    id: "handel-fireworks-peace",
    title: "Music for the Royal Fireworks — Peace",
    composer: "Georg Friedrich Händel",
    duration: "3:47",
    url: "https://upload.wikimedia.org/wikipedia/commons/4/49/George_Frideric_Handel_-_Music_for_the_Royal_Fireworks_3_%28Peace%29_The_sound_quality_is_better_music.ogg"
  },
  {
    id: "handel-fireworks-rejouissance",
    title: "Music for the Royal Fireworks — La Réjouissance",
    composer: "Georg Friedrich Händel",
    duration: "3:07",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f0/George_Frideric_Handel_-_Music_for_the_Royal_Fireworks_4_%28La_Rejouissance%29_The_sound_quality_is_better_music.ogg"
  },
  {
    id: "handel-water-overture",
    title: "Water Music Suite — Overture",
    composer: "Georg Friedrich Händel",
    duration: "3:47",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6e/1-George_Frideric_Handel_-_Water_Music_Suite_in_F_major_%28Overture%29_HWV348.ogg"
  },
  {
    id: "handel-water-adagio",
    title: "Water Music Suite — Adagio e Staccato",
    composer: "Georg Friedrich Händel",
    duration: "2:41",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f2/2-George_Frideric_Handel_-_Water_Music_Suite_in_F_major_%28AdagioEStaccato%29_HWV348.ogg"
  },
  {
    id: "handel-water-air",
    title: "Water Music Suite — Air",
    composer: "Georg Friedrich Händel",
    duration: "3:00",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/03/5-George_Frideric_Handel_-_Water_Music_Suite_in_F_major_%28Air%29_HWV348.ogg"
  },
  {
    id: "handel-water-allegro-mod",
    title: "Water Music Suite — Allegro Moderato",
    composer: "Georg Friedrich Händel",
    duration: "3:21",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/36/8-George_Frideric_Handel_-_Water_Music_Suite_in_F_major_%28Allegro_Moderato%29_HWV348.ogg"
  },
  {
    id: "handel-fantasias",
    title: "Fantasias 8, 12 and Carillon",
    composer: "Georg Friedrich Händel",
    duration: "5:54",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0a/George_Frideric_Handel_-_Fantasias_8%2C12_and_Carillon.ogg"
  },
  {
    id: "handel-hallelujah",
    title: "Messiah — Hallelujah",
    composer: "Georg Friedrich Händel",
    duration: "3:47",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Handel_-_messiah_-_44_hallelujah.ogg"
  },
  {
    id: "handel-sarabande",
    title: "Suite in D minor, HWV 437 — Sarabande",
    composer: "Georg Friedrich Händel",
    duration: "3:30",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e9/Handel_-_Suite_Vol._2_No._4_in_D_minor_HWV_437_-_4._Sarabande.oga"
  }
];

export class MusicPlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.volume = 0.3;
    this.audio.crossOrigin = 'anonymous';
    this.playing = false;
    this.currentIndex = 0;
    this.shuffle = false;
    this.onStateChange = null; // callback({ playing, track })

    // Load preferences
    const prefs = JSON.parse(localStorage.getItem('chess_music_prefs') || '{}');
    this.audio.volume = prefs.volume ?? 0.3;
    this.currentIndex = prefs.trackIndex ?? 0;
    this.shuffle = prefs.shuffle ?? false;

    // Auto-advance to next track when current ends
    this.audio.addEventListener('ended', () => {
      this.next();
    });

    // Handle load errors gracefully
    this.audio.addEventListener('error', () => {
      console.warn('Music track failed to load:', this.currentTrack?.title);
      // Try next track after a short delay
      setTimeout(() => this.next(), 1000);
    });
  }

  get currentTrack() {
    return PLAYLIST[this.currentIndex] || PLAYLIST[0];
  }

  play() {
    const track = this.currentTrack;
    // Compare without protocol to handle src normalization
    const currentSrc = this.audio.src;
    if (!currentSrc || !currentSrc.includes(track.id === this._loadedId ? track.id : '___none___')) {
      this.audio.src = track.url;
      this._loadedId = track.id;
    }
    this.audio.play().then(() => {
      this.playing = true;
      this._notify();
    }).catch(err => {
      console.warn('Music playback blocked:', err.message);
    });
  }

  pause() {
    this.audio.pause();
    this.playing = false;
    this._notify();
  }

  toggle() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  next() {
    if (this.shuffle) {
      let idx = Math.floor(Math.random() * PLAYLIST.length);
      if (idx === this.currentIndex && PLAYLIST.length > 1) {
        idx = (idx + 1) % PLAYLIST.length;
      }
      this.currentIndex = idx;
    } else {
      this.currentIndex = (this.currentIndex + 1) % PLAYLIST.length;
    }
    this._savePrefs();
    this._loadAndPlay();
    this._notify();
  }

  prev() {
    // If more than 3 seconds in, restart current track
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    this.currentIndex = (this.currentIndex - 1 + PLAYLIST.length) % PLAYLIST.length;
    this._savePrefs();
    this._loadAndPlay();
    this._notify();
  }

  setTrack(index) {
    this.currentIndex = index;
    this._savePrefs();
    this._loadAndPlay();
    this._notify();
  }

  _loadAndPlay() {
    const track = this.currentTrack;
    this.audio.src = track.url;
    this._loadedId = track.id;
    if (this.playing) {
      this.audio.play().catch(() => {});
    }
  }

  setVolume(vol) {
    this.audio.volume = Math.max(0, Math.min(1, vol));
    this._savePrefs();
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    this._savePrefs();
    this._notify();
  }

  getProgress() {
    if (!this.audio.duration) return 0;
    return this.audio.currentTime / this.audio.duration;
  }

  _savePrefs() {
    localStorage.setItem('chess_music_prefs', JSON.stringify({
      volume: this.audio.volume,
      trackIndex: this.currentIndex,
      shuffle: this.shuffle
    }));
  }

  _notify() {
    if (this.onStateChange) {
      this.onStateChange({ playing: this.playing, track: this.currentTrack, shuffle: this.shuffle });
    }
  }

  destroy() {
    this.audio.pause();
    this.audio.src = '';
    this.playing = false;
  }
}
