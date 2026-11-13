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


## Nymphs (wood, water and mountain nymph)

The twelfth monster family (AGENTS.md, family **n**). Measured from a person sitting at ease: how upright a sit is and how far back a relaxed one leans. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Human (sitting)

| Measure | Value | Source |
| --- | --- | --- |
| Upright sit | the "90-90-90" sit: hips, knees and ankles each at about 90 degrees, feet flat (an ergonomic guide's rule of thumb, not a population measure) | [The 90-90-90 rule with seating, University of Colorado Denver](https://www.ucdenver.edu/docs/librariesprovider38/tech-for-tykes-documents/tech-tip-the-90-90-90-rule-with-seating.pdf) |
| Relaxed lean | the lumbar spine sits neutral, with least strain, at a trunk-thigh angle of 135 degrees, against an upright 90 (Keegan 1953; positional MRI, RSNA 2006; Keegan's was 4 people and was never replicated) | [Positional MRI of sitting postures, RSNA 2006](https://archive.rsna.org/2006/4435870.html) |
| Reclining | 24 people measured in a seat at seat-back angles of 23, 33, 43 and 53 degrees: the more the recline, the further the pelvis tilts back and the less the lumbar spine flexes | [Seat-back angle and posture, CDC Stacks](https://stacks.cdc.gov/view/cdc/223620) |

*Not found:* a sitter's hip angle on the ground (cross-legged or side-saddle, the nymph's likely rest), the angles of a person sitting on a rock or a log, and any figure for a nymph's beckoning arm. No number is claimed for them; the pose stages set them by eye.

**What the nymphs take from this.** A nymph sits upright at about a right angle at hip and knee, or relaxes back to about 135 degrees between trunk and thigh (45 degrees more open than upright), where a person's back is least strained. A reclined sitter's pelvis tilts back and the lower back rounds less, so a leaning nymph should tip at the hip, not slump at the waist.


## Goblins and orcs (goblin, hobgoblin, the orcs, Uruk-hai)

The thirteenth monster family (AGENTS.md, family **o**). Measured from a soldier: how a drilled troop marches and stands at ease, and how far a slouched sit flexes the lower back. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session. The drill pages are secondary summaries of the Army's drill manual (TC 3-21.5) and disagree among themselves, so both values are kept.

### Human soldier (march, stand at ease, slump)

| Measure | Value | Source |
| --- | --- | --- |
| Quick time | 120 steps a minute with a 30-inch (76 cm) step, heel to heel; the Army's tempo range is 116 to 124 | [Military step](https://en.wikipedia.org/wiki/Military_step) |
| A slower modern march | a normal cadence of 106 steps a minute | [Army Heritage Center, foot marching](https://www.armyheritage.org/wp-content/uploads/ref-bibs/subjects/Marching/Foot%20Marching.pdf) |
| Double time | 180 steps a minute | [Drill and ceremonies, TC 3-21.5 summary](https://open-exam-prep.com/study-guides/army-promotion-board/customs-courtesies-traditions/drill-and-ceremonies-tc-3-21-5) |
| Stand at ease | the parade rest stance with the left foot moved 10 inches (25 cm) to the left, the hands clasped behind the back | [Drill and ceremonies, TC 3-21.5 summary](https://open-exam-prep.com/study-guides/army-promotion-board/customs-courtesies-traditions/drill-and-ceremonies-tc-3-21-5) |
| Stand at ease, another count | the left foot 12 inches (30 cm) to the left | [Cadet trails, week 1 drill lab](https://cadettrails.pages.dev/labs/week1/) |
| Slouched sit | upright sitting already flexes the lowest lumbar joint (L5/S1) past 60% of its range; in slouched sitting the lower three lumbar joints each approach their full flexion | [Evidence of a pelvis-driven flexion pattern, Clin Biomech 2009](https://pubmed.ncbi.nlm.nih.gov/19138810/) |

*Not found:* a slump as an angle in degrees (the studies found say only that slump sitting has more thoracic flexion and less lumbar lordosis), any gait number for a short, broad soldier, and any figure for a rough, unmarching troop's pace. No number is claimed for them; the pose stages set them by eye.

**What the goblins and orcs take from this.** A drilled march is about two steps a second with a step three quarters of a metre long, a pace of about 1.5 m/s, a little faster than a person's usual walk (1.31 m/s); a straggling band marches slower and uneven, near 106 a minute, and a charge runs near 180. At ease, the feet stand about 25 to 30 cm apart (a human's; scale it by leg length) and the hands go behind the back. A slouch is mostly the lower back rounding; there is no angle to cite, so the sit's slump is a character choice.

## Heavy quadrupeds (rothe, mumak, leocrotta, wumpus, titanothere, baluchitherium)

The seventeenth monster family in the plan (AGENTS.md, family **q**). Measured from the animals each is drawn from: an Asian elephant for the walk, a cow for lying down, a rhinoceros for sleep. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Elephant, cow and rhinoceros (walk, lying, sleep)

| Measure | Value | Source |
| --- | --- | --- |
| Elephant walk | Asian elephants walking at about 1.1 m/s on a 15 m path: mean stride length 192 to 199 cm, mean gait cycle time 2.26 to 2.34 s for each limb | [Kongsawasdi et al. 2017, Kafkas Univ Vet Fak Derg](https://vetdergikafkas.org/abstract.php?id=2053) |
| Elephant speeds | over 2,400 strides of 14 African and 48 Asian elephants, from a slow walk at 0.40 m/s up; the fastest verified Asian elephant ran 6.8 m/s; elephants speed up mostly by raising stride frequency | [Hutchinson et al. 2006, J Exp Biol 209](https://cob.silverchair.com/jeb/article/209/19/3812/16362/The-locomotor-kinematics-of-Asian-and-African) |
| Cow lying | a majority of lactating cows lie down about 10 to 12 hours a day; on pasture 9.3 hours, in a freestall barn 11.4 | [Lying Time of Dairy Cows, Texas Dairy Matters](https://texasdairymatters.tamu.edu/files/2022/01/Lying-Time-of-Dairy-Cows.-Importance-of-a-behavioral-need.pdf) |
| Rhinoceros sleep | rhinos sleep in intervals totalling up to about eight hours a day, standing or lying; deep sleep is lying down with the feet curled slightly to one side | [International Rhino Foundation, How much do rhinos sleep?](https://rhinos.org/blog/how-much-do-rhinos-sleep/) |

*Disagreement:* a stride of 1.96 m every 2.3 s is 0.85 m/s, under the 1.1 m/s the same summary quotes; both are kept and the poses take the stride and its time, which are the ones a gait is built from.

*Not found:* a hyena's (leocrotta) or an ox's head or trunk swing as an angle or a period, the elephant's stride frequency stated directly (the 0.43 a second here is the stride time turned over), a lying cow's joint angles, and any hours-a-day figure for how long a rhinoceros lies in sternal posture (one zoo study classes a lying rhino as lateral, a sedation study measures sternal against lateral only in immobilised animals). No number is claimed for them; the pose stages set them by eye.

**What the heavy quadrupeds take from this.** A heavy walker is slow and long in the stride: an elephant's stride is nearly two metres and takes over two seconds, about 0.43 strides a second, so the mumak and the titanotheres plod at about a metre a second, not a trot. A bovine spends about half its day lying, so the rothe settles often and for long; a rhinoceros sleeps less (a third of the day at most) and lies with the feet curled to one side. The lying posture's angles and the trunk or head swing are by eye.

## Rats (enormous, giant, rabid and sewer rat)

The eighteenth monster family in the plan (AGENTS.md, family **r**). Measured from the brown rat. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Brown rat (walk, washing the face, sleep)

| Measure | Value | Source |
| --- | --- | --- |
| Rat walk | between 20 and 80 cm/s a rat's gait keeps its pattern; faster, the stance shortens and the stride lengthens | [Quantitative aspects of normal locomotion in rats, 1979](https://data.zhenzhi.com/details/1/998754936) |
| Rat gait speeds | speed per stride from 31.9 cm/s for a slow walk to 125.9 cm/s for a gallop; a walking stride takes 500 ms | [Muscle activity in rat locomotion, 1975 study](https://typeset.io/pdf/muscle-activity-in-rat-locomotion-movement-analysis-and-11igrit81o.pdf) |
| Face-washing chain | the most stereotyped grooming pattern links up to 25 forelimb strokes and body licks in four phases and lasts about 5 s; the first phase is small ellipses tight round the nose | [Berridge, Fentress and Parr 1987, Natural syntax rules control action sequence of rats](https://www.bohrium.com/paper-details/natural-syntax-rules-control-action-sequence-of-rats/812409028758994945-8574) |
| Rat sleep | at 75 days old a rat is asleep (NREM plus REM) 65.3% of the light phase (58.4 + 6.9) and 43.8% of the dark phase (37.5 + 6.3) | [Frontiers in Neurology 2019, sleep in rats across development](https://www.frontiersin.org/journals/neurology/articles/10.3389/fneur.2019.00873/pdf) |

*Caveat:* the 5 s chain and its 25 strokes came from a search summary that credits the 1987 paper; the page could not be opened to check. The 1979 and 1975 gait pages are matched to their numbers by the search result's own title and wording.

*Not found:* a rat's walking stride length in centimetres, the head-washing bout's own length apart from the whole chain, a resting rat's joint angles or how it holds its tail, and the hunch as an angle. No number is claimed for them; the pose stages set them by eye.

**What the rats take from this.** A rat strides about twice a second at a walk (about 16 cm a stride at the slow walk) and its gait does not change shape between 20 and 80 cm/s, so one walk cycle only stretches. The face wash is a five second chain of about twenty small strokes, 0.2 s each, starting at the nose. A rat sleeps about half the day, more of the light than of the dark, so a rat left alone settles often. Angles and the tail's carriage are by eye.

## Zruty (a bear and an ape)

The next family in the plan (AGENTS.md, family **z**). The zruty is drawn as a huge bear-ape, so its walk is measured from a grizzly and its night from a gorilla. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Grizzly bear (walk) and gorilla (night)

| Measure | Value | Source |
| --- | --- | --- |
| Bear gaits | four captive female grizzlies walk at 1.7 m/s, use a running walk at 2.6 m/s and canter at 2.9 m/s | [SICB conference abstract on grizzly gaits](https://sicb.org/?p=20531) |
| Bear efficient walk | the most energy-efficient walking speed on a treadmill was about 4.2 km/h (1.17 m/s); wild grizzlies were recorded at about 0.6 m/s | [Popular Science on the grizzly treadmill study](https://www.popsci.com/story/environment/why-you-find-bears-hiking/) |
| Gorilla night | about 13 hours a night in the nest, with several hours of rest in the middle of the day | [Taronga Zoo, gorilla](https://taronga.org.au/animals/gorilla) |
| Gorilla nest | a new nest is built each night, started about an hour before sunset | [Dian Fossey Gorilla Fund, gorilla night routines](https://gorillafund.org/gorilla-night-routines/) |

*Caveat:* the 12 hour figure other pages give for the gorilla's night is not cited; the range 12 to 13 is a reading of several search results. The 1 hour before sunset came from a search summary that credits a different page than the one linked.

*Not found:* a bear's stride length or stride frequency (one unreliable site gave figures; not used), a gorilla's knuckle-walking speed, duty factor or stride rate (the studies found cover climbing or all great apes together), and any posture as an angle: a sleeping bear lies curled with its eyes closed, a gorilla sleeps on its side, back or belly. No number is claimed for them; the pose stages set them by eye.

**What the zruty takes from this.** A bear's walk is about 1.7 m/s and its canter about 1.7 times that, so a lumbering walk and a rare lunge. A gorilla sleeps about half a day, mostly at night. Postures and the knuckle walk's timing are by eye.

## Spiders and scorpions (cave spider, giant spider, scorpions)

The nineteenth monster family in the plan (AGENTS.md, family **s**). Measured from wolf spiders and huntsman spiders (running), a fat-tailed scorpion (the raised tail) and jumping spiders (rest). Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Spiders and scorpions (running, the raised tail, rest)

| Measure | Value | Source |
| --- | --- | --- |
| Gait | a vagrant wolf spider (Trochosa ruricola) runs with two alternating sets of four diagonally adjacent legs, like a fast running insect; the burrow-dwelling Lycosa tarentula deviates from that; protraction/retraction ratio rises with both running speed and stepping frequency | [Ward and Humphreys 1981, Locomotion in wolf spiders, J. Exp. Biol.](https://library.museum.wa.gov.au/internaldocs/49467/WardHumphreys1981SpiderLocoJexpBiol.pdf) |
| Running speed scaling | in 128 wolf and huntsman spiders (0.0054 to 3.01 g) maximum speed scaled with body mass to the power 0.353, mean running speed to the power 0.197 | [Journal of Comparative Physiology A 2021, DOI 10.1007/s00359-021-01468-4](https://springerlink.bibliotecabuap.elogim.com/10.1007/s00359-021-01468-4) |
| Fastest spider | the huntsman Heteropoda jugulans reached 3.59 m/s (12.9 km/h) over a very short burst; a preprint, not yet peer reviewed | [ScienceAlert on the 258-species spider race](https://sciencealert.com/the-worlds-fastest-spider-has-been-identified-and-it-can-can-outrun-a-human) |
| Scorpion tail | the tail (metasoma) of the fat-tailed scorpion Androctonus australis is about a quarter of its mass; raising it into the defensive arch moves the centre of mass forward and raises the second leg pair's duty factor, even allowing for the slower walk | [Telheiro, Coelho and van der Meijden 2021, J. Comp. Physiol. A, DOI 10.1007/s00359-021-01467-5](https://link.springer.com/10.1007/s00359-021-01467-5) |
| Rest | jumping spiders rest hanging from a silk thread or upside down on a small silk platform, the body drooping and almost motionless; in the active phases the legs curl and the spinnerets twitch | [Rößler et al. 2022, PNAS 119(33), DOI 10.1073/pnas.2204754119](https://www.nationalgeographic.com/animals/article/jumping-spiders-dream-rem-sleep-study-suggests) |

*Caveat:* the speed and mass figures come from search-result quotes of the papers; the pages were not opened. The 3.59 m/s is a peak over a very short burst. The rest row matches a press page to the PNAS paper by its title and wording.

*Not found:* a spider's stride frequency in Hz or stride length in centimetres (Ward and Humphreys give them but the quoted text does not), a scorpion's walking speed, the tail's arch as an angle, and how many hours a day a spider rests (one blog gave 10 to 14 hours for jumping spiders; not used). No number is claimed for them; the pose stages set them by eye.

**What the spiders take from this.** The eight legs step in two alternating sets of four, not the insects' three, so the walk cycle alternates diagonal quartets. A spider can sprint far faster than it walks: top speed scales with mass to the 0.35, the mean far less, so the idle pace and the lunge are different things. A scorpion's tail is a quarter of its weight and, raised, throws its body forward and loads the front legs more, so the raised sting leans the body onto its front legs. A resting spider droops, legs drawn in, nearly still. Angles and hours are by eye.

## Bats and ravens (bats, raven)

The family in the plan (AGENTS.md, family **B**). Measured from a little brown bat and a horseshoe bat for the roost and the flight, and the common raven for its size. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Bats (the roost, the flight) and the raven (size)

| Measure | Value | Source |
| --- | --- | --- |
| Day on a roost | a little brown bat spends about 15 hours a day in day roosts and 5 in night roosts, with about 4 foraging (Kunz 1980, quoted by a sleep review) | [Sleep review preprint, EcoEvoRxiv](https://ecoevorxiv.org/repository/object/4029/download/7989) |
| Longest sleep | 19.9 hours a day asleep, recorded in 1969 for one captive little brown bat; researchers question it | [Guinness World Records, most sleep for a mammal](https://www.guinnessworldrecords.com/world-records/513008-most-sleep-for-a-mammal) |
| Flight speed | a greater horseshoe bat at its minimum-power speed of 4.8 m/s uses a reduced-span upstroke and decelerates in it | [Aldridge 1987, body accelerations during the wingbeat in six bat species](https://cob.silverchair.com/jeb/article-split/130/1/275/5247/Body-Accelerations-During-the-Wingbeat-in-Six-Bat) |
| Raven size | 58 to 69 cm long with a wingspan of 120 to 150 cm | [BirdForum Opus, Corvus corax](https://www.birdforum.net/opus/Corvus_corax) |

*Caveat:* the 15, 5 and 4 hours came from a search summary that credits Kunz (1980) through a review; the page could not be opened (the host is outside the session's allowed network domains). The raven's size is from a secondary page, and other pages differ slightly (115 to 150 cm span).

*Not found:* the hanging posture as angles (the locking flexor tendon, Quinn and Baumel 1993, lets a bat hang with little muscular effort but gives no joint numbers), the fold of a roosting wing (the Dragons section has the wing numbers), and any number for a raven's hop, walk or head tilt: the searches returned only gulls and cranes. No number is claimed for them; the pose stages set them by eye.

**What the bats take from this.** A bat hangs for about four fifths of a day and flies for under a fifth, so a bat left alone should hang almost always, and a flight is short and fast (about 5 m/s). A raven is a bird about 0.6 m long with a span twice that. The hanging pose, the head tilt and the hop are set by eye.

## Elementals (stalker, fire elemental, earth elemental)

The family in the plan after the centaurs (AGENTS.md, family **E**; the air and water elementals have no body to pose). Each is drawn as a person, so its rest is measured from a person standing still and its creep from very slow walking; the fire elemental's own motion, its flicker, is measured from real buoyant flames. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session (the hosts are outside the session's allowed network domains).

### Person (quiet stance, creeping) and flame (flicker)

| Measure | Value | Source |
| --- | --- | --- |
| Quiet stance sway speed | the centre of pressure moves about 9.2 mm/s with the eyes open in 100 young adults (mean age 22); eyes closed, 11.2 mm/s in women and 12.38 mm/s in men | [Posturographic standards for optimal control of human standing posture](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10170532/) |
| Quiet stance sway amplitude | front-to-back amplitude over 10 s about 5.5 to 5.6 mm in 28 active students before fatigue (5.6 ± 1.3 mm in the men) | [Journal of Human Kinetics, postural sway and fatigue](https://jhk.termedia.pl/pdf-159452-87600) |
| Very slow walking | step length grows as speed to the power 0.577 and step time shrinks as speed to the power 0.423; at the slowest speed both feet are down for about 55% of the cycle against about 12% at a person's own pace | [Smith and Lemaire, Scientific Reports 2019](https://link.springer.com/10.1038/s41598-019-54271-2) |
| Flame flicker | a buoyant flame puffs at f = 0.48 √(g/D), the same as 1.5 / √D with D the base width in metres; another review's best fit is 1.68 / √D; pools a few centimetres wide puff near 10 Hz | [Xia et al., Flickering of buoyant diffusion flames (arXiv 1803.10400)](https://arxiv.org/pdf/1803.10400), [review of pulsation of buoyant diffusion flames and pool fires](https://repository.lboro.ac.uk/articles/journal_contribution/A_review_of_research_and_experimental_study_on_the_pulsation_of_buoyant_diffusion_flames_and_pool_fires/9547682), [APS DFD 2017 abstract on pool-fire puffing](https://archive.aps.org/dfd/2017/d35/1) |

*Caveat:* the 1.68 factor came from a search summary that credits a 1996 review by Malalasekera and colleagues through another paper; the stance amplitude depends on trial length and platform, so it is an order of size, not a norm.

*Not found:* any measure of a person stalking or sneaking as such (the studies found are of slow walking in general), a hunter's crouch as an angle (the kobolds' crouch numbers stand for it), and how an earth elemental's stone body would move. No number is claimed for them; the pose stages set them by eye.

**What the elementals take from this.** Standing still, a body is never quite still: it drifts a few millimetres front to back, about a centimetre a second, so an idle elemental's rest is a slow sway, not a frozen statue. The stalker's creep at about 0.3 m/s takes steps about 0.43 of a usual step and keeps both feet down for over half of every stride. A fire elemental about half a metre across flickers about 2.1 to 2.4 times a second (a candle's 10 Hz would read as a small flame, not a big body), and a wider one slower.

## Horses (pony, horse, warhorse and the three unicorns)

The family in the plan (AGENTS.md, family **u**). Measured from the domestic horse: how long it sleeps and how much of that it spends lying down, the resting stance on a cocked hind leg, and the walk of trained horses. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Horse (sleep, lying, the cocked hind leg, walk)

| Measure | Value | Source |
| --- | --- | --- |
| Sleep | an adult horse sleeps about 2.5 to 5 hours a day, about 80% of it standing; at least 30 minutes lying down a day gives it about 3.5 to 4.5 minutes of REM sleep | [Sleep and recumbency in sanctuary horses, Animals 2021 (PMC8614510)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8614510) |
| Lying down | 83 sanctuary horses lay down 0 to 319 minutes a day, a mean of 67.4 | [the same](https://pmc.ncbi.nlm.nih.gov/articles/PMC8614510) |
| Sternal and lateral | lying on the chest takes about 6 to 10% of a horse's time budget, flat on its side about 1 to 4%; REM sleep needs one or the other | [Frontiers in Veterinary Science 2017, recumbency and REM sleep (PMC5339441)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5339441) |
| Cocked hind leg | standing at rest one hind leg is locked by the stay apparatus and carries the hindquarter, and the other rests flexed on the toe of its hoof; the hock and stifle flex together (the reciprocal apparatus) | [WikiVet, stay apparatus (horse anatomy)](https://en.wikivet.net/Stay_Apparatus_-_Horse_Anatomy) |
| Walk | six dressage horses walked 1.37 m/s collected, 1.73 medium and 1.82 extended, with strides of about 157 to 193 cm taking 1,159 to 1,064 ms (Clayton 1995) | [Comparison of the stride kinematics of the collected, medium, and extended walks in horses (AGRIS record)](https://agris.fao.org/search/fr/records/65df0ea563b8185d9caa9089) |

*Caveat:* the REM minutes differ between sources (an older finding quoted by a magazine gives 30 to 60 minutes; not used). The walk numbers are trained dressage horses, and only one of the six kept a perfectly even four-beat rhythm. The cocked leg comes from an anatomy wiki, not a measurement.

*Not found:* the cocked hind leg as an angle, how often a resting horse swaps legs, and any rate or height for the head toss (the head-movement studies found are of headshaking disease, given as ratios between groups). No number is claimed for them; the pose stages set them by eye.

**What the horses take from this.** A horse dozes on its feet: most of its rest is standing, one hind leg cocked on the toe with the hock dropped, the hip on that side sunk. It lies down only about an hour a day, mostly on its chest with the legs folded under, and flat on its side for a few minutes. So an idle horse should cock a hind leg long before it lies down, and lying should be the rarer, longer rest. The walk is about 1.4 to 1.8 m/s with a stride of about 1.6 to 1.9 m taking just over a second.

## Worms (baby and adult long worm, baby and adult purple worm, remorhaz)

The family in the plan (AGENTS.md, family **w**: an earthworm and a snake, the concertina crawl). The worms' crawl is measured from the earthworm's peristaltic crawl and the snake's concertina; their rest from a worm's drought coil and a snake's resting coil; their signature behaviour, the lunge of the maw from a raised coil, from snake strikes. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session (the hosts are outside the session's allowed network domains).

### Earthworm (crawl, rest) and snake (concertina, strike)

| Measure | Value | Source |
| --- | --- | --- |
| Peristaltic crawl, by size | earthworms of 0.012 to 8.5 g; bigger worms crawl faster (speed ∝ mass^0.33) mostly by longer strides (stride ∝ mass^0.41), with a slightly slower beat (frequency ∝ mass^-0.07) and the same duty factor (∝ mass^-0.03); normalised by body length the crawl is the same at every size | [Quillin 1999, Kinematic scaling of locomotion by hydrostatic animals, J Exp Biol 202:661](https://jeb.biologists.org/content/202/6/661) |
| Concertina anchors | a corn snake in a 4 cm channel presses on the walls at four to six places at once; climbing a 60 degree channel it pushes the walls with up to nine times its weight and digs its belly scales in to double its friction | [Marvi and Hu 2012, Friction enhancement in concertina locomotion of snakes, J R Soc Interface](https://pubmed.ncbi.nlm.nih.gov/22728386/) |
| Strike | Texas rat snake: peak 2.67 m/s, 16.7 cm reach, 74 ms; cottonmouth: 2.98 m/s, 13.6 cm, 66 ms (32 snakes; the rattlesnake peaked at 279 m/s²) | [Penning, Sawvel and Moon 2016, Debunking the viper's strike, Biology Letters (PMC4843225)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4843225), [phys.org summary](https://phys.org/news/2016-03-vipers-fastest.html) |
| Strike reach | a rattlesnake can strike a third to the whole of its length, rarely past a half | [Crotalus summary](https://en.wikipedia.org/wiki/Crotalus) |
| Rest | a lumbricid waits out drought coiled into a tight ball in a mucus-lined chamber (Lumbricus rubellus about 0.45 m down); captive corn snakes rest loosely coiled in a large enclosure, tightly or partly coiled in a small one | [UC Davis SAREP, Lumbricus rubellus profile](https://webarchive.library.unt.edu/eot2008/20090116024238/http:/www.sarep.ucdavis.edu/worms/profile7.htm), [aestivation of Hormogaster elisae (2006)](https://www.ucm.es/data/cont/media/www/pag-26131/Aestivation%20(2006).pdf), [Does enclosure size influence the behaviour of captive snakes (Pantherophis guttatus)? Applied Animal Behaviour Science 2021](https://www.sciencedirect.com/science/article/abs/pii/S0168159121002227) |

*Caveat:* the earthworm's stride frequency (about 0.25 Hz) and stride length (about 0.15 body lengths) near 1 g come from a secondary summary that credits them to a numbered reference not confirmed to be Quillin; they are kept only as an order of size. The strike reach is from an encyclopaedia summary, not a measurement. An older figure of 5 to 20 locomotory waves a minute could not be traced to its paper and is not used.

*Not found:* a concertina cycle's period or speed for a snake on the ground (the tunnel speeds of Jayne and Davis 1991 did not come up), the angle of a snake's raised S before a strike, and any coil's size against body length. No number is claimed for them; the pose stages set them by eye.

**What the worms take from this.** A worm crawls slowly, a few hundredths of its length a second, and a bigger worm goes faster by longer strides, not a faster beat: a baby and an adult share the beat, the adult's waves are longer. The body grips at four to six places at once and the rest bunches up between them. At rest a worm lies coiled, a tight ball when it is hiding. Its signature is the strike: from a raised, coiled front a snake lunges about a sixth of a metre in about 70 ms, peaking near 3 m/s, and rarely reaches past half its length; a long worm's maw should snap out that fast and that far for its size, then draw back slowly.

## Grid bugs and xans (grid bug, xan, chillbug)

The family in the plan (AGENTS.md, family **x**: insects, the grid bug's square scuttle stays its own). The grid bug and the chillbug are drawn as flat, armoured scuttlers, so they are measured from cockroaches: how one rests, how it runs, and its escape (the signature: turn away, then run). The xan is a winged insect whose hooked tail stinger curls forward under it, so its strike is measured from wasps. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Cockroach (rest, gait, escape)

| Measure | Value | Source |
| --- | --- | --- |
| Gait | the American cockroach (*Periplaneta americana*, 0.83 g) runs an alternating tripod from 0.44 to 1.0 m/s, and switches to four and then two legs at 1.0 to 1.5 m/s, with aerial phases above 1 m/s | [Full and Tu 1991, J Exp Biol 156:215](https://cob.silverchair.com/jeb/article-pdf/156/1/215/2579388/jexbio_156_1_215.pdf) |
| Top speed in body lengths | about 50 body lengths a second; an earlier 1.3 m/s was nearly 40 | [UF Book of Insect Records, chapter 39](https://entnemdept.ufl.edu/walker/ufbir/chapters/chapter_39.shtml), citing McConnell and Richards 1955 |
| Tripod and stepping rate | stepping faster than about 7 Hz holds a tightly constrained tripod, slower walkers vary their leg coordination; the gait changes near a Froude number of about 0.4 (*Blaberus discoidalis*) | [Bender et al., PLoS ONE (PMC3102013)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3102013) |
| Rest | the main rest in the light period has the body and the antennae both touching the surface (*Blaberus giganteus*); a still but alert one stands with the legs extended and the body partly raised, the antennae moving | [Tobler 1983 (PubMed 6871020)](https://pubmed.ncbi.nlm.nih.gov/6871020/), [J Exp Biol 118:449](https://cob.silverchair.com/jeb/article-pdf/118/1/449/2637031/jexbio_118_1_449.pdf) |
| Escape latency (the signature) | 58 ms on average from a wind puff to the escape starting, as low as 11 ms with controlled puffs; it first turns away from the attack, then runs | [Camhi, Tom and Volman 1978, J Comp Physiol 128 (via a course handout)](https://web.as.uky.edu/biology/faculty/cooper/Bio450-AS300/cockroach%20ceri/cockroach.pdf), [Levi and Camhi 1996, J Exp Biol 199:563](https://cob.silverchair.com/jeb/article-pdf/199/3/563/3389532/jexbio_199_3_563.pdf) |
| Escape threshold | a puff of 12 mm/s (600 mm/s² acceleration) is enough to set it off | [the same handout, citing Plummer and Camhi 1981](https://web.as.uky.edu/biology/faculty/cooper/Bio450-AS300/cockroach%20ceri/cockroach.pdf) |

### Wasp (the sting)

| Measure | Value | Source |
| --- | --- | --- |
| The curl | a paper wasp can swiftly bend its abdomen into a sharply curved shape when it attacks; its thin waist lets the abdomen move freely against the thorax (a honeybee's underside stays flat) | [a paper-wasp stinger study (PMC4571097)](https://rcastoragev2.blob.core.windows.net/92655755c0527f882d60807919019c2a/PMC4571097.pdf) |
| Insertion angle | the stinger goes in at a shallow slant, not straight down: about 10° is the most efficient for a wasp's, 6° for a honeybee's (from the stinger's mechanics, not filmed stings) | [Scientific Reports 2018, via ScienceDaily](https://www.sciencedaily.com/releases/2018/10/181009102420.htm) |

*Caveat:* the latencies are from different stimuli (58 ms for natural puffs, 11 ms at best) and were read from a teaching handout and abstracts, not the papers. The insertion angle is modelled.

*Not found:* a cockroach's rest as heights or angles, how far it turns before running, and how far a wasp's abdomen tip swings forward in a strike. No number is claimed for them; the pose stages set them by eye.

**What the grid bugs and xans take from this.** A grid bug or chillbug at rest settles flat: belly and feelers down on the floor, still. Alert, it stands up on extended legs with the feelers waving. It scuttles in tripods, quick steps of 7 Hz or more, and flat out a cockroach covers 40 to 50 of its lengths a second, so even a slow grid bug's scuttle is a blur of legs, not a stroll. Its signature is the startle: about a twentieth of a second after the hero comes near it jerks round away from the threat and bolts (the grid bug's own square turn). The xan's strike is a wasp's: the abdomen whips round under the body into a tight curl and the sting goes in at a shallow slant, about 10° off the skin, not straight down.

## Gnomes (gnome, gnome lord, gnome king, gnomish wizard)

The family in the plan (AGENTS.md, family **G**: a short human, the waddle). A gnome is drawn as a short-legged person, so it is measured from people with achondroplasia, the commonest short-limbed stature: how they stand (the rest), how the pelvis swings when they walk (the waddle, the signature) and the walk's main numbers. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Short-legged person (stance, the pelvis's swing, walk)

| Measure | Value | Source |
| --- | --- | --- |
| Walk | 16 children with achondroplasia walked 0.98 m/s with 0.38 m steps at 152.8 steps a minute; 19 age-matched controls 1.32 m/s, 0.61 m and 128.3 | [Broström et al. 2022, Gait in children with achondroplasia, BMC Musculoskeletal Disorders](https://bmcmusculoskeletdisord.biomedcentral.com/articles/10.1186/s12891-022-05343-4) |
| Walk, leg length taken out | speed normalised by leg length and gravity was the same in both groups, 0.49 and 0.48 | [the same](https://bmcmusculoskeletdisord.biomedcentral.com/articles/10.1186/s12891-022-05343-4) |
| Walk, adults | 10 adults with achondroplasia walked 23% slower than 17 controls, with 29% shorter strides at a 13% higher stride frequency, the legs more flexed through the cycle | [Sims et al. 2020, Gait and Posture (MMU e-space)](https://e-space.mmu.ac.uk/626148) |
| Standing pelvis (the rest) | peak forward tilt of the pelvis 20.0° against 11.0° in the controls (children); 21.9° in adults, put down to the lumbar lordosis | [Broström et al. 2022](https://bmcmusculoskeletdisord.biomedcentral.com/articles/10.1186/s12891-022-05343-4), [EORS 2016 abstract, Bone and Joint](https://boneandjoint.org.uk/Article/10.1302/1358-992X.99BSUPP_1.EORS2016-011) |
| The waddle | the pelvis turns about the vertical through 19.6° a stride against 12.2° (children), 28.7° in adults; its side-to-side tip is not raised, 7.4° against 8.0° | [Broström et al. 2022](https://bmcmusculoskeletdisord.biomedcentral.com/articles/10.1186/s12891-022-05343-4), [EORS 2016 abstract](https://boneandjoint.org.uk/Article/10.1302/1358-992X.99BSUPP_1.EORS2016-011) |
| Walk to run | people of any leg length change from a walk to a run near a Froude number of 0.5 | [Transition from walking to running](https://en.wikipedia.org/wiki/Transition_from_walking_to_running) |

*Caveat:* the walk and pelvis numbers are children's (6 to 12 years) except where marked adult; the adult samples are about ten people. The adult tilt and rotation are from a conference abstract. Hip flexion contracture and an exaggerated lumbar lordosis are described in reviews of achondroplasia, but no adult standing angle came up.

*Not found:* how a short-legged person sits or sleeps, the pelvis's drop in adults (Sims 2020 measures it; the value did not come up), and any measure of the trunk's own side sway. No number is claimed for them; the pose stages set them by eye.

**What the gnomes take from this.** A gnome stands with its pelvis tipped forward about 20° (nearly twice a person's 11°) and the small of its back hollowed, the belly forward and the rump out. It walks at about three quarters of a person's pace by steps about 0.6 of a person's, taken about 1.2 times as fast, about 0.4 s a step; for its leg length that is just a person's walk. The waddle is the pelvis swinging round: about 10° to 14° each way from straight with every step, against a person's 6°, while it tips side to side no more than a person's (about 4° each way). So the waddle is a turning, rolling-forward hip, not a side-to-side rock.

## Couatl, ki-rin and angels (couatl, ki-rin, Aleax, Angel, dark angel, archon)

The family in the plan (AGENTS.md, family **A**: a feathered serpent and a horse for the ki-rin; a human for the angels). The couatl is drawn as a winged serpent hovering in the air, so its gait is measured from the flying snake's aerial undulation and its rest from a resting snake's coil; the ki-rin is a horse, so its walk and rest are the Horses section's and its signature is the horse's rear, the levade; the angels are tall people, so their rest is a person's quiet stance and their signature the sword arm raised overhead. Each number is one a search result quoted from the named page; the pages themselves could not be opened from a cloud session.

### Flying snake (the glide) and resting snake (the coil)

| Measure | Value | Source |
| --- | --- | --- |
| Aerial undulation | a paradise tree snake (*Chrysopelea paradisi*) gliding at equilibrium undulates at about 1.4 Hz with a wave about 23% of its snout-vent length high; earlier glides 1 to 2 Hz and 20 to 34% | [Socha and LaBarbera 2005, Effects of size and behavior on aerial performance of two species of flying snakes, J Exp Biol 208:1835](https://cob.silverchair.com/jeb/article/208/10/1835/15326/Effects-of-size-and-behavior-on-aerial-performance) |
| Undulation, 3D capture | sample trials at 1.15 to 1.46 Hz, a large side-to-side wave (about 100 to 112°) and a smaller up-and-down one (about 28 to 31°); the undulation keeps the snake from tumbling | [Yeaton, Ross, Baumgardner and Socha 2020, Nature Physics, supplementary information](https://ross.aoe.vt.edu/papers/yeaton-ross-baumgardner-socha-2020-SI.pdf), [EurekAlert release](https://www.eurekalert.org/news-releases/588478) |
| Glide | 6.8 m/s forward, 3.0 m/s sinking, a 25° glide angle; before it, a 1 to 5 m ballistic dive at 52 to 62° | [Socha and LaBarbera 2005](https://cob.silverchair.com/jeb/article-pdf/208/10/1835/1252347/1835.pdf) |
| Rest | ambushing rattlesnakes lie coiled for long stretches: six species filmed for 8,300 hours met a predator about once every 250 coiled hours | [Maag and Clark 2022, Safety in coils, Amphibia-Reptilia](https://ouci.dntb.gov.ua/works/4YdqywP7) |

### Horse (the levade)

| Measure | Value | Source |
| --- | --- | --- |
| Levade | the horse holds its body about 30 to 35° from the ground, the forehand raised on deeply bent, tucked hindquarters carrying all its weight | [Airs above the ground (Wikipedia, via search)](https://en.wikipedia.org/wiki/Levade) |
| Pesade | the older, steeper rear at about 45° to the ground; an expert answer puts the levade under 45° | [the same](https://en.wikipedia.org/wiki/Levade), [Dressage Today](https://dressagetoday.com/theory/experts-29431/) |

### Person (quiet stance, the raised arm)

| Measure | Value | Source |
| --- | --- | --- |
| Quiet stance | most people stand leaning about 3° forward, the centre of mass a little ahead of the ankle | [Physiology News, Understanding standing](https://www.physoc.org/magazine-articles/understanding-standing/), [PMC5529402](https://pmc.ncbi.nlm.nih.gov/articles/PMC5529402) |
| Arm raised overhead | shoulder flexion 180° (the textbook normal), about 168° measured actively; elbow flexion 145 to 150° | [Physiopedia, range of motion normative values](https://www.physio-pedia.com/Range_of_Motion_Normative_Values), [PMC1713230, table 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC1713230/table/T2), [CDC joint range of motion study](https://archive.cdc.gov/www_cdc_gov/ncbddd/jointrom/index.html) |

*Caveat:* the flying snake glides downward from a height; it cannot hover, so the couatl's hover borrows only the wave's beat and height. The levade and pesade angles are from an encyclopaedia and a trainer's answer, not measurements. The stance lean is a magazine's summary of studies it does not name.

*Not found:* a resting snake's coil size against its length, the time a horse holds a levade or how fast it rises into it, and any measure of a person holding a weapon overhead. No number is claimed for them; the pose stages set them by eye.

**What the couatl, ki-rin and angels take from this.** The couatl swims the air: a slow wave, about one and a half beats a second, running down a body bent side to side about a quarter of its length, with a smaller up-and-down ripple; when it glides down it pitches about 25° nose down. At rest it settles coiled, head on top of the coil, and can stay so for hours. The ki-rin walks and rests as a horse (see Horses); its display is the levade, the forehand lifted until the body is about 30 to 35° off the floor, all its weight on bent, tucked hind legs. An angel stands nearly upright, leaning only about 3° forward from the ankles, and its signature is the blade raised overhead: the arm swung up close to 170° from hanging, the elbow free to bend up to about 150°.
