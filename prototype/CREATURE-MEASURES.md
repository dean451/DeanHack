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
