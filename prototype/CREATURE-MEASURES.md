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

## Wild cats (jaguar, lynx, panther, tiger and the other monster cats)

The sixth monster family (AGENTS.md, family **f**; the lion's lying and sleep numbers are above under Dragons, "Big cat"). Measured from the tiger and the leopard, the two big cats the monster cats are drawn from, and from the stealthy crouched walk of the domestic cat.

### Tiger and leopard (size, tail, rest, stalking walk)

| Measure | Value | Source |
| --- | --- | --- |
| Tiger head and body | males 189 to 300 cm, females 146 to 177 cm | [San Diego Zoo tiger fact sheet](https://ielc.libguides.com/sdzg/factsheets/tiger/characteristics) |
| Tiger tail and shoulder | tail 72 to 109 cm (under half of head and body); shoulder height 80 to 100 cm | [San Diego Zoo tiger fact sheet](https://ielc.libguides.com/sdzg/factsheets/tiger/characteristics) |
| Leopard head and body, tail | head and body 91 to 191 cm, tail 58 to 110 cm | [San Diego Zoo leopard fact sheet](https://ielc.libguides.com/sdzg/factsheets/leopard/characteristics) |
| Time asleep or resting | tigers 16 to 20 hours a day (a keeper's guide, so loose: it counts dozing and resting as well as sleep) | [Big Cats India, how many hours do tigers sleep](https://bigcatsindia.com/how-many-hours-do-tigers-sleep/) |
| Stalking walk | six housecats walking a runway recovered on average 17.6 ± 11.3% of their mechanical energy (best 37.9%, a dog up to about 70%); the crouched, more diagonal footfall is what costs it, a trade of economy for stealth | Bishop, Pai and Schmitt 2008, ["Whole body mechanics of stealthy walking in cats", PLoS ONE 3(11): e3808](https://pmc.ncbi.nlm.nih.gov/articles/PMC2583958) |

*Not found:* a wild cat's sphinx (sternal) rest as an angle or a chin-to-paw distance, and a crouched stalk's speed or belly height in a tiger or leopard (the sources describe a low body and slow paw-by-paw steps, with no number; the cat paper is on housecats, the same body plan). No number is claimed for them; the pose stage sets them by eye against photographs.

**What the wild cats take from this.** A tiger is long (tail under half the head and body) and sleeps most of the day, so a monster cat settles into the pet cat's lying pose readily. Stalking, the walk is crouched with a diagonal footfall (a rear foot follows the opposite front foot closely): the body low, the stride short and even, never bouncing.

## Canines (jackals, foxes, dogs, wolves, hell hounds)

The fourth monster family (AGENTS.md, family **d**). Measured from the domestic dog: how it sleeps, how fast it walks and trots, and when it plays. Each number below is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Dog (sleep, walk, trot, play bow)

| Measure | Value | Source |
| --- | --- | --- |
| Curled sleep | the curled-up position is the most common, 71% of 2,000 UK owners reporting; owners believe their dogs sleep about nine hours a day (an owner survey by Guide Dogs, so what owners say they see, not a measurement) | [Yorkshire Evening Post on the Guide Dogs survey](https://www.yorkshireeveningpost.co.uk/read-this/the-unusual-and-adorable-sleeping-habits-of-dogs-revealed-in-new-survey-of-owners-3373970) |
| Walking speed | adult Labrador retrievers walked a treadmill at 0.78 and 0.96 m/s, stride time and stance duration recorded from 3-D markers at 240 Hz | ["Kinematic and spatiotemporal assessment of habituation to treadmill walking in Labrador retrievers"](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5192580/) |
| Trot speed | 14 trotting dogs (small, about 6.5 kg on average) crossed a pressure walkway at 0.9 to 1.1 m/s | [Pressure-walkway study of trotting dogs, PMC5015230](https://pmc.ncbi.nlm.nih.gov/articles/PMC5015230) |
| Play bow | bows most often come after a brief pause in play, to restart it, not during rough or ambiguous moves | Byosiere, Espinosa and Smuts 2016, ["Investigating the function of play bows in adult pet dogs"](https://about.illinoisstate.edu/vfdouga/files/2019/10/byosiere-epinosa-smuts-2016-invest-funct-of-play-bows-in-adult-pet-dogs.pdf) |

*Not found:* a dog's duty factor at a trot, a curl's wrap angle, a play bow's duration (Bekoff 1977 calls its duration and form stereotyped but the abstract gives no number), and any wolf or jackal figure. No number is claimed for them; the pose stages set them by eye.

**What the canines take from this.** A dog walks at about 0.8 to 1 m/s and trots at about the same pace in a small dog, so the walk and trot are told apart by footfall, not speed. It most often sleeps curled up. The play bow is a pause-breaker: it comes after a lull, not in the middle of a fight.

## Gargoyles and gremlins (gargoyle, winged gargoyle, gremlin)

The seventh monster family (AGENTS.md, family **g**). Measured from a macaque (the crouch: how much of a day a monkey spends sitting still) and a perched hawk (the winged gargoyle's perch; the raptor's flight and mantle numbers are above under Dragons, "Bird of prey"). Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Macaque and perched hawk (rest, perch)

| Measure | Value | Source |
| --- | --- | --- |
| Macaque resting | adult rhesus macaques in a Nepal forest spent 33.83% of observed time resting (moving 26.67%, feeding 22.92%, grooming 15.42%); the largest single share | [Diurnal activity budget of rhesus macaques, Daunne Forest, Nepal](https://elibrary.tucl.edu.np/items/b81c01e3-6847-4cc6-8897-25444adc57b1/full) |
| Macaque resting, mangrove | long-tailed macaques in a mangrove spent 34.1% of the year resting | [Mangrove macaque activity budget, Jurnal Primatologi Indonesia](https://journal.ipb.ac.id/primatology/article/view/46387) |
| Hawk on one foot | overwintering merlins, radio-tracked over 486 hours, stood on one foot up to about 22% of the time (at -10 to -19 C), less when warmer or colder (a 2024 *Laterality* study as quoted by a search result; the thread linked is a birders' forum discussing the posture) | [One-leg perching by hawks, iNaturalist forum](https://forum.inaturalist.org/t/one-leg-perching-by-hawks/53523) |

*Not found:* a monkey's crouch as an angle (spine curve, head drop) or a duration, and a raptor's perch as a leg or tail angle. The sources count time, not posture. No number is claimed for them; the pose stages set them by eye against photographs.

**What the gargoyles take from this.** A monkey rests about a third of its day, and a gargoyle, being stone, can rest far longer: a long still crouch is in character, with the move to it slow. A hawk stands on one foot for a fifth of its time at most, so a winged gargoyle's one-footed perch is an occasional shift, not its rest.

## Humanoids (hobbit, dwarves, bugbear, mind flayer)

The eighth monster family (AGENTS.md, family **h**). Measured from an adult human. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Human (walk)

| Measure | Value | Source |
| --- | --- | --- |
| Usual walking speed | 1.31 m/s mean outdoors in healthy adults (95% CI 1.27 to 1.35) | [Murtagh et al., Sports Medicine 2020](https://link.springer.com/10.1007/s40279-020-01351-3) |
| Usual cadence | 116.65 steps a minute at that pace | [Same review, PMC7806575](https://pmc.ncbi.nlm.nih.gov/articles/PMC7806575) |
| Preferred step width | about 0.13 of leg length, close to one foot's width | [Step width study, SFU locomotion lab](https://www.sfu.ca/locomotionlab/assets/stepwidth2001.pdf) |

*Not found:* a slumped sitting posture as an angle that a source states outright (the studies found say only that slump sitting has more thoracic flexion), and any gait number for short-statured people, so the dwarf's wide stance has no source: the pose stages set it by eye, and the width above scales with leg length, so a dwarf's is narrower in centimetres, not wider.

**What the humanoids take from this.** A step is about two thirds of a metre at a person's usual pace and the feet fall about an eighth of a leg apart; the short folk take proportionally shorter, narrower steps. A wide stance is a character choice, not a measurement.

## Imps (imp, homunculus, quasit, tengu, lemure)

The ninth monster family (AGENTS.md, family **i**). Measured from a monkey (the imps' squat and scamper: how fast and in what order a monkey walks) and a head-bobbing bird (the tengu's crow head; the cockerel's bob is under Cockerels above). A monkey's rest share is under Gargoyles and gremlins above (33.83% of observed time, rhesus in Nepal) and is not repeated. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Monkey and bird (walk, head bob)

| Measure | Value | Source |
| --- | --- | --- |
| Monkey walking speed | young adult rhesus and cynomolgus monkeys walked a treadmill at 0.4 to 1.0 m/s, with diagonal and lateral gaits; swing phases shorten as speed rises | [Rhesus and cynomolgus treadmill walking, PMC12964192](https://pmc.ncbi.nlm.nih.gov/articles/PMC12964192) |
| Monkey gait order | Japanese macaques on a treadmill at 0.4 to 1.7 m/s showed the diagonal pattern (each hind foot follows the foot of the fore limb on its own side) at every constant speed tested | [Quadrupedal locomotor movements in monkeys (M. fuscata) on a treadmill, kinematic analyses](https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_miscellaneous_78593947) |
| Bird head bob and speed | ring-billed gulls bobbed their heads at the slower speeds: 2.56 plus or minus 0.66 head lengths a second (n = 11) against 3.98 plus or minus 1.48 (n = 11) when not bobbing; running cranes did not bob at all | [Head-bobbing and terrestrial locomotion in charadriiform birds, SICB](https://sicb.org/?p=25934) |

*Not found:* a monkey's squat as a hip or knee angle (the macaque numbers found are bipedal walking, not a crouch), any crow's or raven's bob frequency, and anything about a small climbing or perching monkey's rest, so the imp's squat and the tengu's bob amplitude are set by eye against photographs. The gull figure is not a crow's; it says only that a bob belongs to a walk and goes at a run.

**What the imps take from this.** A monkey-footed imp walks at about half a metre to a metre a second in diagonal pairs (the left fore with the right hind), not as a cat does; the tengu's head bobs once a step at a walk and holds still, unbobbing, when it runs.


## Kobolds (kobold, large kobold, kobold lord, kobold shaman)

The tenth monster family (AGENTS.md, family **k**). Measured from a person walking crouched (the kobolds' hunched stalk) and from a dog's head and neck (the dog-like head carriage; the dog's walk pace is under Canines above and is not repeated). Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Crouched human and dog head (crouch, speed, head carriage)

| Measure | Value | Source |
| --- | --- | --- |
| Crouch threshold | crouch gait is bent-hip, bent-knee walking with about 30 degrees of minimum knee flexion | [Crouch gait as forced-use exercise in stroke](https://samafind.sama.gov.sa/index.php/EdsRecord/edsair,edsair.doi.dedup.....d464c9b346eaa5f63d4865596df6b3c9) |
| Crouch and pace | 15 healthy men simulating crouch gait with the knee held at 45 degrees walked at about half their normal speed (one of two summaries of the study; the other reports no speed difference for crouch with equinus) | [Compensatory strategies in simulated crouch gait, Korea Science](https://www.koreascience.or.kr/article/JAKO200416549674196.pdf) |
| Dog head on the neck | the atlas (skull on neck) rotated in the sagittal plane by 5.7 to 14.5 degrees (Labrador retrievers) and 9.1 to 18.7 degrees (Chihuahuas) on average through a treadmill walk | [Craniocervical kinematics of walking dogs, Frontiers in Veterinary Science 2021](https://www.frontiersin.org/articles/10.3389/fvets.2021.709967/pdf) |

*Not found:* a dog's static head height above the withers or neck angle at rest, and a crouched walk's step length or hip angle. No number is claimed for them; the pose stages set the hunch's hip and spine by eye against photographs.

**What the kobolds take from this.** A kobold's hunch is a real crouch: knees bent past 30 degrees, and a crouching walker is slow, about half a person's pace. Its dog-like head tips a few to nearly twenty degrees on the neck as it walks, not a fixed pose.

## Leprechauns (leprechaun)

The eleventh monster family (AGENTS.md, family **l**). Measured from a person: how deep a squat goes (the leprechaun's rest is a crouch) and how fast skipping is (its jig is a hop-step gait). Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Human (squat, skip)

| Measure | Value | Source |
| --- | --- | --- |
| Deep squat | 35 healthy subjects reached average peak hip and knee flexion of 107° and 112° | [Personalized musculoskeletal modelling of the deep squat, PMC8512761](https://pmc.ncbi.nlm.nih.gov/articles/PMC8512761) |
| Squat as a rest | the squat is widely performed while resting, socializing, toileting and household chores in some non-western cultures | [Squat kinematics study, PMC3916928](https://pmc.ncbi.nlm.nih.gov/articles/PMC3916928) |
| Skipping speed | skipping and running compared at fixed speeds of 2.68 m/s (a 2016 East Carolina University thesis) and 2.5 m/s (Journal of Applied Biomechanics, 2022); skipping is a gait between walking and running | [East Carolina University thesis on skipping and running](https://thescholarship.ecu.edu/items/b8cf42cd-ec46-40fb-b8cc-56d02d11dd33) |
| Usual walk | 1.31 m/s outdoors, 116.65 steps a minute (35 studies, 14,015 people) | [Murtagh et al. 2021, Sports Medicine](https://pubmed.ncbi.nlm.nih.gov/33030707/) |

*Not found:* a resting squat's angles (the numbers above are the peak of a lifting squat, so a rest is no deeper), a skip's step length or flight time, and any figure for a heel click. No number is claimed for them; the pose stages set them by eye.

**What the leprechaun takes from this.** Its rest crouch is no deeper than a human's deepest squat: knee about 112°, hip about 107°. Its jig can travel at about twice a person's walk (2.5 to 2.7 m/s against 1.3), a hop-step between a walk and a run, not a dance on the spot.

