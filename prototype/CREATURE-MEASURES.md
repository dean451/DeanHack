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
