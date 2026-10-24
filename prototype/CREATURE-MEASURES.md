# Creature measures

The real-animal numbers behind the creature behaviour plan (AGENTS.md, "Creature behaviour plan"). One section per family, every number with its source. The same numbers are exported from `creature-measures.js`, with ranges checked in `creature-measures.test.js`.

**How these were gathered.** The cloud sessions that write this file can run web searches but cannot fetch journal pages, Wikipedia or museum sites (the network policy blocks them). So each number below is one a search result quoted from the named source, and it is cited to that source. Where no source gave a number, the posture is written down as the sources describe it, with no angle invented. The pose stages turn those descriptions into goals and check them by eye against the references.

## Dragons

A dragon's regions are measured from four real animals: a monitor lizard for the neck, trunk, tail and walk; a big cat for lying down and sleep; a bat for folding the wings; a bird of prey for mantling over a kill.

### Monitor lizard (neck, trunk, tail, walk)

| Measure | Value | Source |
| --- | --- | --- |
| Tail share of total length, Komodo dragon | about one half | Search quotes of the Wikipedia article ("the tail accounts for around half of its length"): [tapatalk bestiary, Komodo dragon](https://www.tapatalk.com/groups/bestiary/komodo-dragon-varanus-komodoensis-t85.html). One fact page claims over 60% ([edunovations](https://edunovations.com/notes/science/biology/reptiles_gk/komodo-dragon-facts-faqs-behaviour-habitat-and-conservation/)); we use 0.45 to 0.6. |
| Head yaw while running, against the trunk's yaw | head 4.76 ± 0.99°, the trunk segment behind it 27.0 ± 3.8° (*Acanthodactylus boskianus*, flat runway) | Goyens and Aerts 2018, "Head stabilisation in fast running lizards", [PubMed 29456166](https://pubmed.ncbi.nlm.nih.gov/29456166/) |
| Head range on flat ground | pitch 3.2 ± 1.03°, yaw 4.74 ± 1.9°, roll 9.03 ± 3.44° | the same group's follow-up on the same species, quoted with the paper above ([ScienceDirect abstract](https://www.sciencedirect.com/science/article/abs/pii/S0944200617301915)) |
| Trunk bending at a walk | a standing wave, its nodes at the shoulder and hip girdles; at speed it becomes a wave travelling down the body | Green iguanas "bending laterally from side to side forming standing waves, with the nodes at the girdles" ([Carrier, hypaxial muscles in lizards](https://carrier.biology.utah.edu/Dave's%20PDF/Hypaxial%20Lizard.pdf)); a water monitor's spine bends the same way, standing at slow gaits, travelling at fast ones ([Pak Biawak gait analysis, bioRxiv 2025](https://www.biorxiv.org/content/10.1101/2025.07.12.664518v1.full)) |
| Tail swing | the tail base swings further as the lizard goes faster; the tail's curvature does not change with speed | 43 species, [Tail base deflection but not tail curvature varies with speed in lizards, ICB 2021](https://academic.oup.com/icb/article/61/5/1769/6261763) |

*Not found:* a monitor's resting neck lift, or its tail curvature at rest, in degrees.

**What the dragon takes from this.** The tail is about half the body's length. Walking, the trunk swings as a standing wave about the girdles while the head stays nearly steady, its yaw about a sixth of the trunk's (4.76 / 27.0 = 0.18); the tail base swings more the faster it goes.

### Big cat (lying down, sleep)

| Measure | Value | Source |
| --- | --- | --- |
| Lion head and body length | males 172 to 250 cm, females 158 to 192 cm | [San Diego Zoo lion fact sheet](https://ielc.libguides.com/sdzg/factsheets/lions/characteristics), after Wilson and Mittermeier 2009 |
| Lion tail length | 60 to 100 cm | [Toronto Zoo, African lion](https://www.torontozoo.com/animals/African%20lion) and the San Diego sheet above |
| Nose-to-tail-tip length and tail, adult zoo lions | males 255 ± 15 and 105 ± 11 cm; females 236 ± 11 and 94 ± 10 cm (tail 0.40 to 0.41 of the whole) | Addis Ababa Zoo lions, [Springer, 10.1023/A:1023641629538](https://link.springer.com/article/10.1023/A:1023641629538) |
| Time asleep | 16 to 20 hours a day in the wild | [zoo resource library, *Panthera leo*](https://resourcelibrary.clemetzoo.com/Specie/74) |

*Not found:* a sleeping cat's curl angle, or its chin-to-paw distance. The pet cat's curl in `feline-rest.js` was already set against the user's reference photos, and the sleeping dragon reuses its goals: chin on the forepaws, the tail laid round the body on the floor.

**What the dragon takes from this.** A big cat is asleep most of the day, so an idle dragon should settle into sleep readily (stage D6). Its tail is about two fifths of its length, so the cat's wrap needs a longer tail path on the dragon (half its length).

### Bat (folding the wings)

| Measure | Value | Source |
| --- | --- | --- |
| Little brown bat forearm | 36 to 40 mm (other guides 33 to 42) | Wisconsin DNR species guidance via [Tethys](https://tethys.pnnl.gov/publications/little-brown-bat-myotis-lucifugus-species-guidance); [Maryland DNR](https://dnr.maryland.gov/wildlife/Pages/plants_wildlife/bats/Battypes/Little-Brown-Bat.aspx) |
| Little brown bat wingspan | 222 to 269 mm | the same Wisconsin guidance; Missouri gives 22 to 27 cm ([MDC](https://mdc.mo.gov/index%2ephp/node/219849)) |
| Little brown bat total length | 80 to 98 mm | Wisconsin and Maryland, as above |
| How the wing folds | the fingers bend at several joints so the wing folds tightly beside the body; the third finger folds over at rest; the folded wing may partly wrap the underside; the membrane gathers into wrinkled folds | [Britannica, bat: form and function](https://www.britannica.com/animal/bat-mammal/Form-and-function) |

*Not found:* the angle of a folded forearm against the body, or the wrist's height over the shoulder.

**What the dragon takes from this.** The forearm is about a third of the half-span (38 / (245 / 2) = 0.31; range 0.27 to 0.36). Folded, the fingers lie back along the forearm, so a folded wing is not much longer than its forearm. The wing folds tight beside the body with the membrane in pleats, and the third finger turns over.

### Bird of prey (mantling)

| Measure | Value | Source |
| --- | --- | --- |
| Red-tailed hawk length | males 45 to 56 cm, females 50 to 65 cm | [All About Birds, red-tailed hawk](https://www.allaboutbirds.org/guide/Red-tailed_Hawk/id) |
| Red-tailed hawk wingspan | 114 to 133 cm | the same |
| The mantle | wings spread and drooped over the kill, tail fanned, body arched over it, shoulders hunched, head down over the prey; some birds fan the tail only part way | ["The mantle vs. to mantle", ccbbirds.org](https://ccbbirds.org/2009/06/27/the-mantle-vs-to-mantle/); [Feathered Photography, rough-legged hawk mantling](https://featheredphotography.com/blog/2013/01/17/rough-legged-hawk-mantling-then-take-off/); [FeederWatch, red-tailed hawk with prey](https://feederwatch.org/community/participant-photos/red-tailed-hawk-with-prey/) |
| Why | it hides the kill from other predators and makes the bird look bigger; tits react more strongly to a sparrowhawk model with its wings spread | the sources above, and a 2024 study in Scientific Reports ([DOAJ](https://doaj.org/article/0c5b8fce77764c1aadb4804d1cf45c71)) |

*Not found:* the angle of the wings in a mantle.

**What the dragon takes from this.** A raptor's span is about 2.3 times its length (124 / 54; range 1.75 to 2.96). In a mantle the wings go out and down, forward over the forepaws and the kill, not up; the tail fans and lifts; the back arches; the head drops low over the prey.

## Insects (ants, bees, beetles, locusts)

The first monster family (AGENTS.md, family **a**). Measured from real ants (the tripod gait, the raised gaster), honeybees (size, sleep) and stag beetles (size, the male's weapons).

### Ants (gait, defence)

| Measure | Value | Source |
| --- | --- | --- |
| Gait | an alternating tripod (three legs planted, three swinging) across a wide range of speeds; 12 species of *Cataglyphis*, *Formica*, *Lasius* and *Myrmica* | Zollikofer 1994, "Stepping patterns in ants", [J Exp Biol 192](https://cob.silverchair.com/jeb/article-pdf/192/1/95/2854548/jexbio_192_1_95.pdf) |
| Stride length against speed | s = a v^b, with b between 0.3 and 0.6 by species | the same paper ([J Exp Biol 192:107](https://cob.silverchair.com/jeb/article-pdf/192/1/107/2854414/jexbio_192_1_107.pdf)) |
| Running | above 370 mm/s the stride frequency levels off, the duty factor falls below 0.5 and the ant runs with aerial phases (*Cataglyphis fortis*); a faster walk shortens the stance, not the swing | [J Comp Physiol A 2015, doi 10.1007/s00359-015-0999-2](https://link.springer.com/article/10.1007/s00359-015-0999-2) |
| Defence | the gaster is raised and flexed forward over the body so the sting or spray reaches an attacker in a full circle round the head; *Crematogaster* wipes the venom on with a blunt spatula-shaped sting | [AntWiki, *Crematogaster aurora*](https://antwiki.org/wiki/Crematogaster_aurora) |

*Not found:* a resting ant's posture (legs folded or not), and the duty factor below the running threshold, as numbers.

### Honeybee (size, sleep)

| Measure | Value | Source |
| --- | --- | --- |
| Worker length | 10 to 15 mm | [dimensions.com, western honey bee](https://dimensions.com/element/western-honey-bee-apis-mellifera) |
| Sleeping posture | head lowered, antennae slack and drooping, the thorax and abdomen sagging with the wings settled against the body; motionless for up to 30 minutes | Klein et al. 2014, "Mapping sleeping bees within their nest", as quoted by [UW-La Crosse](https://www.uwlax.edu/currents/buzzworthy-study-on-bee-sleep/) |
| Sleep, seen in the abdomen | breathing movements and the abdomen tip's larger motions tell a sleeping bee from a heating one; sleep was 16.9% of observations | Klein and Busby 2020, [PeerJ 9583](https://peerj.com/articles/9583) |

### Stag beetle (size, weapons)

| Measure | Value | Source |
| --- | --- | --- |
| Length | males 36 to 89 mm with the mandibles, about 28 to 56 mm without; females 26 to 45 mm (*Lucanus cervus*, Bosnia) | [Bulletin of the Natural History Museum, Belgrade, 2010](https://nhmbeo.rs/wp-content/pdfovi/Bulletin-2010-11.pdf) |
| Weapons | a male's mandibles are longer than his head and are used to fight other males; a female's are shorter than her head | [Nature Conservation, Pensoft](https://natureconservation.pensoft.net/article_preview.php?id=12681) |

**What the insects take from this.** An ant walks in two alternating tripods, its stride growing with speed, and defends with the gaster lifted and flexed forward over its back. A bee at rest lets head, antennae, thorax and abdomen sag and lies still for half an hour. A male beetle is about a third again as long with his mandibles as without, and they are longer than his head. Joints: `insect-joints.js`.

## Cockerels (chickatrice, cockatrice, pyrolisk)

The second monster family (AGENTS.md, family **c**; the monitor lizard is measured above under Dragons). Measured from the domestic fowl and its wild ancestor, the red jungle fowl: the strut and head bob, the crow, and how a hen rests at night.

### Fowl (head bob, crow, night rest)

| Measure | Value | Source |
| --- | --- | --- |
| Head bob | one head cycle per step: a hold phase (head still against the ground while the body passes under it) then a thrust phase (head jerked forward); the hold share of the stride falls steadily as speed rises, and at the fastest speeds the neck stays extended with no bob | [Necker, "Head-bobbing of walking birds, a review"](https://reinhold-necker.de/seite10.html); [Hancock et al. 2014, Ibis](https://people.ohio.edu/stevensn/documents/Hancock%20et%20al%202014.pdf) |
| Head bob, why | in chickens on a treadmill the bob follows visual motion velocity, not walking speed: the head is held still to see | Hataji, Otaki and Fujita 2015, [abstract](https://behaviour-2015.m.asnevents.com.au/schedule/session/6634/abstract/24884) |
| Crow, length | 1.51 s in the morning, 1.86 s at noon, 1.61 s in the afternoon (10 Burgo roosters, Bengkulu) | [Biodiversitas / smujo.id, crowing of Burgo roosters](https://smujo.id/biodiv/article/download/5127/3677/17445) |
| Crow, red jungle fowl | a crow sequence averages 29 calls over 1416 ms | [Temporal structure of red jungle fowl crow sequences](https://acnpsearch.tweb-dev.unibo.it/singlejournalindex/186895) |
| Crow, posture | the head raised, often with the wings flapped | [Soundcy, how a rooster sounds](https://soundcy.com/article/how-does-a-rooster-sound) (a web guide, not a study) |
| Night | caged hens roost on a perch about 85% of the dark period | Duncan et al. 1992, as summarised by [the Refinement Database](https://refinementdatabase.org/publications/effects-of-perches-in-laying-cages-on-welfare-and-production-of-hens) |
| Night, posture | seven hens filmed overnight slept prostrate (lying) 77% of the night, the rest standing asleep, standing awake or grooming | [Nocturnal activity of hens, UACJ](https://cathi.uacj.mx/20.500.11961/29135) |

*Not found:* the head's travel in centimetres or the bob's frequency in hertz for a chicken (the sources give the pattern and the one-per-step rhythm, not the amplitude), and any study of a crowing cock's neck angle. A hen's tucked head and one raised leg are described only by keepers' accounts, so no number is claimed for them.

**What the cockerels take from this.** A walking fowl bobs once per step: the head hangs still in the air while the body passes beneath it, then darts forward, and the faster it goes the less it holds. A crow lasts about one and a half to two seconds, head raised. At night the fowl sits the perch for most of the dark and is down on its breast for most of that.
