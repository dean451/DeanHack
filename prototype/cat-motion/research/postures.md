# Domestic cat postures and transitions: research notes for a low-poly rig

Compiled 2026-10-19.

## Read this first: how reliable these sources are

- **WebFetch was down for this whole session.** Every host failed DNS (ENOTFOUND) or was refused by the egress proxy: PMC, Frontiers, Wikipedia, DOAJ, RVC repository. Every number below therefore comes from **web-search result excerpts** of the cited pages (abstracts, snippets, table fragments). No full text was read.
- **No images or radiographs could be opened**, so this file contains **no claims from image inspection**.
- Labels used:
  - **SOURCED (where)**: the number appeared in a search excerpt attributed to that page.
  - **SOURCED-2nd**: the number came from a secondary review that cites the original. Check the original before relying on it.
  - **ESTIMATED**: my own reasoning from sourced facts. The derivation is always given.
  - **not found**: searched for, and nothing usable turned up.
- Re-fetching the "to verify" URLs (end of file) when web fetch works would probably fill several gaps, especially the greyhound sit-to-stand joint-angle tables and Jaeger's goniometry table.

---

## 1. Sitting posture (the "upright sit")

### 1a. What touches the floor: ethogram definitions

| Source | Definition (quoted from excerpt) | Status |
|---|---|---|
| Stanton, Sullivan & Fazio 2015, *A standardized ethogram for the Felidae*, Appl Anim Behav Sci 173:3–16. https://www.researchgate.net/publication/275060791 | "Cat is in an upright position, with the hind legs flexed and resting on the ground, while front legs are immobile, with all four paws on the ground and legs extended, supporting the body." | SOURCED (search excerpt) |
| Ellis & Wells, quoted in a Univ. of Lincoln teaching resource. http://www.learnaboutcats.co.uk/chapters/7-measuring-behaviour/a-How-to-measure-behaviour/3-developing-an-ethogram.html | "SITTING – Cat is positioned with its front legs extended straight, front paws and rump on the ground" | SOURCED (search excerpt) |
| Kappel et al., *Ethogram of the Domestic Cat*, Pets 1(3):284–314. https://www.mdpi.com/2813-9372/1/3/21 | "The cat sits with the hind part of its body completely on the ground. Its front paws touch the ground, and its front legs are fully stretched upward." | SOURCED (search excerpt) |

**Implications for the rig:**

- **Floor contacts.** All three definitions agree:
  - The rump (hind part of the body) is on the ground.
  - The hind legs are flexed and resting on the ground.
  - The forelimbs are straight and vertical, with the front paws down.
- **Ischial tuberosities vs. caudal thigh as the contact.** Not found specifically for cats. In humans, the ischial tuberosities are "the most prominent anatomic landmark in the seated posture" and act as "the stationary pivot axis for the pelvic rotation" (human seating source, surfaced in the dog-pelvis search; transfer to cats is unverified).
  - ESTIMATED: the cat's contact patch is the ischial region plus the caudal thigh and the flexed hindlimb segments, not the hip joint itself. Reasoning: the ethogram says "rump" and "hind legs ... resting on the ground", and the hip joint sits well above and cranial to the ischium (see section 5).
- **Hocks and metatarsals flat on the floor while sitting.** Not found in any cat-specific primary source.
  - A search summarizer asserted it from general knowledge without a citation. Do not treat that as sourced.
  - Dog sources say a normal ("square") sit requires full stifle and tarsal flexion, "tucking the hocks under the pelvis" (consumer source, https://pawgen.com/blog/why-is-my-dog-sitting-with-a-leg-out-to-the-side).
  - Dog sources also say "a negative test when the dog can comfortably bend the stifle and tarsal joints all the way" (veterinary orthopaedic-exam proceedings; see VIN WSAVA 2015 https://www.vin.com/apputil/content/defaultadv1.aspx?pId=14365&catId=73697&id=7259326 and Clinician's Brief https://www.cliniciansbrief.com/article/pelvic-limb-lameness-canine-dog-bone-joint-orthopedic-exam). Species: dog.
  - ESTIMATED: in a cat sit, the metatarsus lies roughly along the floor, from hock to toes, with the tarsus near full flexion. This follows from "hind legs flexed and resting on the ground" plus the dog rule that a normal sit uses full tarsal flexion.

### 1b. Joint angles in sitting

**Cat sitting joint angles: not found.** No radiograph, photogrammetry, or kinematic study of a sitting cat surfaced. The closest bounds come from the joint-range limits below. A normal sit is described (in dogs) as using near-maximal flexion of the hip, stifle, and tarsus.

**Cat passive joint ranges** (Jaeger et al. 2007, *Validity of goniometric joint measurements in cats*, AJVR 68(8):822; 20 healthy cats), as reproduced in the review "Hips, elbows and stifles: common joint diseases in the cat", JFMS 2012, https://pubmed.ncbi.nlm.nih.gov/22247322/:

| Joint | Max flexion (joint angle) | Max extension | Status |
|---|---|---|---|
| Hip | ~33° | ~164° | SOURCED-2nd (search excerpt of JFMS review Table 1) |
| Stifle | ~24° | ~164° | SOURCED-2nd (same) |
| Tarsus | 21° flexion / 167° extension, labelled "normal" in a single-case report; not verified as Jaeger's mean | — | SOURCED, low confidence (case-report excerpt from goniometry search) |
| Shoulder, elbow, carpus | not found (the values are in Jaeger 2007 Table 1: https://www.researchgate.net/figure/Angle-measurements-of-joints-to-determine-ROM-in-20-cats-without-sedation-during_tbl1_6170431) | | not found |

Convention: the angle is the included angle between adjacent segments, so 180° means straight.

ESTIMATED use for the rig:

- In a full sit, the stifle and tarsus approach their flexion limits. The tibia then folds almost onto the femur (stifle about 25–40°), and the metatarsus folds almost onto the tibia (tarsus about 20–40°).
- The hip is flexed, but less than its 33° limit. The forelimbs must stay vertical while the trunk tilts up, so the femur ends up roughly near horizontal to slightly raised, pointing forward.
- These ranges are inferences from the goniometric limits plus the dog "full flexion" description. They are not measurements.

**Dog data:**

| Measure | Value | Species, source | Status |
|---|---|---|---|
| Largest stifle (patellar) flexion angle, seen during sitting | 92° (the largest among sit, walk, trot) | Dog (6 dogs), fluoroscopic patellofemoral study, BMC Vet Res 2016 https://link.springer.com/article/10.1186/s12917-016-0889-z / https://pmc.ncbi.nlm.nih.gov/articles/PMC5123255 | SOURCED (search excerpt). Caveat: the convention may be flexion from straight (so 92° flexion means about an 88° included angle). Not verified. |
| Hip flexion/extension range during sit-to-stand | Half of the walking range | Beagle (n=8), Yoshikawa et al. 2023, Res Vet Sci 162:104944 https://www.sciencedirect.com/science/article/abs/pii/S0034528823001893 ; preprint https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4421905 | SOURCED (abstract) |
| Stifle and tarsal ranges during sit-to-stand | About 2× the walking range | Same | SOURCED (preprint abstract) |
| Pelvis (ischiopubic symphysis) orientation in standing | "consistently nearly horizontal"; the lumbar spine varies widely | Dog (n=17), Lu et al. 2026, AJVR https://avmajournals.avma.org/view/journals/ajvr/aop/ajvr.26.04.0154/ajvr.26.04.0154.xml / https://pubmed.ncbi.nlm.nih.gov/42190712/ | SOURCED (abstract) |

### 1c. Hip height, pelvis angle and the rest of the body while sitting

| Quantity | Value | Status |
|---|---|---|
| Pelvis angle to horizontal, sitting | not found (cat or dog) | not found |
| Hip joint height sitting ÷ standing hip height | not found | not found |
| Standing hip height (cat), reference | **23 cm** average across the step cycle in walking cats on a treadmill; 16 cm in crouched walking (a 30% drop) | SOURCED: Trank, Chen & Smith 1996, J Neurophysiol 76:2316, doi 10.1152/jn.1996.76.4.2316 (search excerpt) |
| Knee relative to elbow, sitting | not found | not found |
| Femur angle sitting | not found (see the ESTIMATED note in 1b) | not found |
| Spine curvature sitting | not found | not found |
| Forelimb shoulder, elbow, wrist in sit | Forelegs "extended", "straight", "fully stretched upward" (ethograms in 1a). No angles. | SOURCED (qualitative only) |
| Chest height, head height sitting | not found | not found |

**ESTIMATED, the key point for the "hip too close to floor" bug.**

- The ethograms put the **rump**, not the hip joint, on the floor.
- The floor contact (ischial tuberosities plus caudal thigh) sits caudal and ventral to the hip joint. The section 5 landmark triangle puts the greater trochanter close to the ischiatic tuberosity but higher than it, and the acetabulum sits dorsal to the trochanter.
- The fully flexed femur, tibia and metatarsus, with the large thigh muscle mass wrapped around them, are also stacked under and beside the hip.
- So the hip joint should sit clearly above the floor. As a geometric guess, it is at least the pelvic depth from acetabulum to ischium plus the soft-tissue thickness.
- No numeric ratio to standing hip height was found. Obtain one from a lateral photo or radiograph measurement before hard-coding it.

---

## 2. Other rest postures

| Posture | Definition / key joints | Status and source |
|---|---|---|
| Crouch (ambush) | "Its body is pressed to the ground and all four legs touch the ground. Its head is also close to the ground, and its neck is outstretched. ... context of ambushing prey." | SOURCED: Kappel et al. MDPI ethogram https://www.mdpi.com/2813-9372/1/3/21 |
| Crouch, depth reference | A cat walking under a ceiling lowered its hip from 23 to 16 cm (−30%) "keeping its trunk horizontal" | SOURCED: Trank et al. 1996 (above) |
| "Sitting", BMC Biol 2022 variant (cat-attractant plant study) | "crouched posture with the body near the ground and the belly touching or slightly raised" (not fear-crouching) | SOURCED: https://bmcbiol.biomedcentral.com/articles/10.1186/s12915-022-01369-1/tables/3 |
| Lay on belly (sternal / sphinx-like) | Lower body touching the ground, trunk straight. A "half lay on the side" variant has the underside down with the front paws extended forward "sphinx-like". | SOURCED (partial excerpt): MDPI ethogram |
| Lie curled | "Positioned with body pulled into a compact circular formation; this can be further subdivided based on the degree of tightness." | SOURCED: UFAW ethogram (Ethnogram for behavioural studies of the domestic cat), https://dokumen.pub/an-ethnogram-for-behavioural-studies-of-the-domestic-cat-felis-silvestris-catus-l-ufaw-animal-welfare-research-report-1nbsped-0900767901-9780900767906.html |
| Lateral recumbency | Defined by which side the cat rests on; no joint data | SOURCED (qualitative): BMC Biol 2022 Table 3 |
| Loaf ("tucked", paws under the chest) | Legs tucked under the body, often with the tail wrapped; only in pet-care sites (hepper.com, darwinspet.com). No peer-reviewed definition. | not found in peer-reviewed sources |
| Curled vs stretched as a function of temperature | Pet-care consensus: curl when cool, stretch when warm. No controlled study. | not found (only https://www.cats.org.uk/cats-blog/what-do-cat-sleeping-positions-mean, non-research) |
| Joint angles for any rest posture | — | not found |

**Standing reference:**

- During quiet standing, the cat's limb axes are kept nearly vertical. Limb flexion and centre-of-mass projection vary minimally with platform tilt (cat tilting-platform study, Deliagina group; https://pubmed.ncbi.nlm.nih.gov/16527856/). SOURCED (excerpt).
- In quiet standing, the knee, ankle and MTP extensors are active and the hip muscles are "remarkably silent". SOURCED: *The cat step cycle: EMG patterns ... posture*, J Morphol, https://onlinelibrary.wiley.com/doi/10.1002/jmor.1051550302
- Felids keep a crouched limb posture across a 300-fold size range. SOURCED: Cuff et al. 2016, J Anat (excerpt).
- Weight distribution: forelimbs bear more than hindlimbs.
  - Walking peak vertical force: 48.2% BW forelimb vs 38.3% BW hindlimb (Roe et al., 15 cats).
  - 52.8% of pressure on the forelimbs at walk (12 cats).
  - Static standing in intact cats: not found.
  - Sources: https://www.researchgate.net/publication/6393519 ; https://link.springer.com/chapter/10.1007/978-3-642-12020-6_15 . SOURCED (excerpts).

---

## 3. Transitions

| Transition | Data | Species | Status / source |
|---|---|---|---|
| Sit→stand, duration | **1.14 ± 0.16 s** | Greyhound | SOURCED: Ellis, Rankin & Hutchinson 2018, Front Bioeng Biotechnol 6:162, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6250835/ |
| Sit→stand, hindlimb order | Proximal→distal. Hip extends mostly over about 0–20% of the movement, knee about 10–50%, ankle about 25–60%. | Greyhound | SOURCED: same (excerpt) |
| Sit→stand, forelimbs | Shoulder extension minimal. Elbow extends slowly throughout. Wrist dorsiflexes until about mid-cycle, then little motion. Maximal forelimb joint extension about 20–53°, largest at the elbow. Forelimb motion is smaller than hindlimb motion. | Greyhound | SOURCED: supplementary Data Sheet 1 (excerpt) https://figshare.com/articles/dataset/Data_Sheet_1_Limb_Kinematics_Kinetics_and_Muscle_Dynamics_During_the_Sit-to-Stand_Transition_in_Greyhounds_PDF/7350650/1 |
| Sit→stand, character | Passes "through near-maximal joint motion ranges from a crouched ... to a more upright posture". Ankle range in sit-to-stand is more than 2× the trotting range (trot means: hip ~31°, knee ~54°, ankle ~36°). | Greyhound | SOURCED: same |
| Sit→stand and stand→sit, phases | Hindlimb joint movements are monophasic. They cannot be split into sub-phases by range of motion alone. | Beagle | SOURCED: Yoshikawa et al. 2023 (abstract) |
| Sit→stand and stand→sit, cat | — | Cat | not found |
| Stand→sit, duration | — | any | not found |
| Stand→lie, lie→stand (sequence, duration) | — | cat / dog | not found. Animal sit-to-stand literature is "very scarce" (emu paper, Lin et al. 2024, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11708823/) |
| Pre-jump crouch to take-off (cat, maximal vertical jump) | Propulsion has a preparatory phase, then a launching phase of **about 150 ms**. Proximal (hip) extensors activate before distal ones. Different cats take varied paths through the preparatory phase but reach the same position and momentum at its end. | Cat | SOURCED: Zajac, Zomlefer & Levine 1981, J Exp Biol 91:73–86, https://ncbi.nlm.nih.gov/pubmed/7241037 |
| Pre-jump joint angles (cat) | Hip about 90° → 175°; knee about 45° → about 160° from preparatory phase to lift-off; ankle follows a similar pattern after heel-off | Cat | SOURCED-2nd: *Feline Locomotion* review citing Zajac 1981 (garbled PDF text), https://www.researchgate.net/publication/344595815_Feline_Locomotion |
| Preparatory crouch duration and depth | — | Cat | not found |
| Pre-pounce "wiggle" (hindquarters treading) | Described qualitatively: weight shifts back onto the hindquarters, hind feet tread while judging distance. No timing. | Cat | SOURCED (qualitative, pet-care / ASPCA): https://www.aspcapro.org/sites/default/files/aspca_felineality_cat_body_postures_0_0.pdf ; duration not found |
| Jump performance predictors | Take-off velocity is explained by hindlimb length and fat mass relative to lean mass, not by extensor mass (18 cats) | Cat | SOURCED: Harris & Steudel 2002, J Exp Biol 205:3877, https://pubmed.ncbi.nlm.nih.gov/12432010/ |

ESTIMATED (animation guidance only):

- For a cat sit→stand, a greyhound-like order is plausible: hip first, then knee, then ankle, with the forelimbs nearly passive. The greyhound duration of about 1.1 s can serve as a ceiling, since a smaller animal is likely a bit faster.
- This is cross-species inference, not cat data.

---

## 4. Idle behaviours

| Behaviour | Number | Status / source |
|---|---|---|
| Spontaneous blink rate | **1–5 blinks/min**, "complete blinks are infrequent" (textbook summary; dogs 3–5, horses 2–25) | SOURCED (summary page, not a primary study): https://www.sciencedirect.com/topics/biochemistry-genetics-and-molecular-biology/blinking |
| Slow blink | In the human→cat experiments, owners' slow blinks were delivered at 14.58/min. This is the stimulus rate, not the cat's own rate. | SOURCED: Humphrey et al. 2020, Sci Rep, https://www.nature.com/articles/s41598-020-73426-0 |
| Daily time budget (pet cats, accelerometry) | Lying ~37%, sitting ~37%, standing ~13% (about 3 h) | SOURCED (AVSAB summary of Smit et al. 2024; primary https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11053832/): https://avsab.org/can-computers-tell-us-what-cats-do-all-day/ |
| Standing share, indoor vs free-roaming | 10.4% vs 14.0% | SOURCED: https://www.mdpi.com/2813-9372/3/2/17 |
| Tail position in cat–cat encounters | "In a great majority of the 254 interactions ... both cats held their tail down". Tail up is mostly seen approaching humans before rubbing. | SOURCED: *Heads and Tails*, Animals 2021, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8469685/ |
| Ear movement vocabulary | CatFACS: about 14–15 Action Units, 6 Action Descriptors, 7 Ear Action Descriptors (counts differ between sources), e.g. "Ears constrictor" and "Ears downwards". Frequencies not given. | SOURCED: https://www.sciencedirect.com/science/article/abs/pii/S0168159117300102 |
| Ear twitch, tail flick, weight-shift frequency at rest | — | not found |

---

## 5. Landmarks and proportions for a low-poly sculpt

| Item | Value | Status / source |
|---|---|---|
| Greater trochanter vs pelvis | With the hip in place, the trochanter lies **ventral to the line from the craniodorsal ilium to the ischiatic tuberosity, and closer to the tuberosity**. The three points form a triangle with the trochanter as its most ventral point. | SOURCED: Veterinary Ireland Journal, coxofemoral luxation in cats, https://www.veterinaryirelandjournal.com/small-animal/384-coxofemoral-luxation-in-cats-aetiology-diagnosis-and-management |
| Feline pelvis shape | Nearly rectangular in VD view; ilial wing and ischiatic tuberosity project laterally only slightly ("box-like") | SOURCED: Univ. Minnesota dog/cat anatomy lab guide, Appendix A, https://open.lib.umn.edu/dogcatanatomylabguide/back-matter/appendix/ |
| Withers (shoulder) height | About 23–25 cm; one site cites a 24 cm mean | SOURCED, low quality (non-peer-reviewed pet sites): https://www.catwiki.com/faqs/how-tall-is-the-average-cat/ |
| Withers height from bone length | A regression study exists (37 cats); its means were not retrieved | not found (numbers). Poradowski et al. 2024, Vet Sci 11:522, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11598937/ |
| Head–body length | About 45–51 cm | SOURCED, low quality: https://www.thepetcalculator.com/cat-weight-guides/cat-body-condition-score/ and https://www.wildcatsofafrica.info/african-serval-cat/serval-cat-size-with-comparison-to-domestic-cats-and-lions/ |
| Standing hip height | 23 cm (walking average) | SOURCED: Trank et al. 1996 |
| Femur length | 114.4 ± 3.2 mm (comparative study); 78–129 mm range | SOURCED: https://pmc.ncbi.nlm.nih.gov/articles/PMC6702901/ ; https://boneidentification.com/bones/cat-femur/ |
| Tibia length | 111.6 mm (CT, 8 cats; 95% CI 107.9–115.5). Radiographic values are lower (80.6 mm female, 86.8 mm male). | SOURCED: Pantangco et al. 2026, JFMS, https://pmc.ncbi.nlm.nih.gov/articles/PMC13153514/ |
| Scapula top (withers) position along body length; trochanter or ischium as a fraction of body length/height | — | not found |
| Haunch muscle mass | The largest hindlimb extensors active in jumping make up 3.23 ± 0.57% of body mass (18 cats, 2.7–7.9 kg) | SOURCED-2nd (citing Harris & Steudel 2002): https://www.researchgate.net/publication/297933051 |
| Why the haunch looks round and high when sitting | — | not found as a stated anatomical explanation |

ESTIMATED, haunch shape:

- With the stifle and tarsus near full flexion, the femur and tibia (each about 11 cm, comparable to the 23 cm standing hip height) fold side by side. The quadriceps, hamstrings and gastrocnemius bunch around them, so the thigh becomes a thick rounded mass beside and under the hip.
- That stack of bone and muscle is what holds the hip above the floor and makes the haunch read as a high, round bulge.
- Proportion check (ESTIMATED arithmetic from sourced lengths): femur 114 mm + tibia 112 mm ≈ 226 mm, roughly equal to the 23 cm walking hip height. This is consistent with a crouched (not straight) standing limb, where the metatarsus also contributes height.

---

## Gaps (not found)

- Any measured sitting-cat geometry:
  - pelvis tilt
  - hip height (absolute or as a ratio to standing)
  - femur, stifle and hock angles in the sit
  - knee versus elbow position
  - spine curvature
  - chest and head height
- Radiographs or photogrammetry of sitting cats.
- Cat sit→stand, stand→sit, stand→lie and lie→stand sequences and durations. Only greyhound and beagle sit-to-stand data exist.
- Cat pre-jump crouch duration and depth. Only the 150 ms launching phase is known.
- Joint angles for loaf, sphinx, curled and lateral postures.
- Frequencies of ear twitches, tail flicks and weight shifts at rest.
- Landmark positions as fractions of body length.

## To verify when web fetch works (likely to fill gaps)

1. Ellis et al. 2018 greyhound sit-to-stand, full text and Table/Fig 3, for sitting joint angles: https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2018.00162/full ; data on figshare https://figshare.com/projects/Limb_Kinematics_Kinetics_and_Muscle_Dynamics_During_the_Sit-to-Stand_Transition_in_Greyhounds_data/55904
2. Jaeger et al. 2007 cat goniometry Table 1 (all six joints): https://avmajournals.avma.org/view/journals/ajvr/68/8/ajvr.68.8.822.xml
3. Zajac et al. 1981 cat jump, preparatory phase duration and angles: https://journals.biologists.com/jeb/article/91/1/73/ (doi 10.1242/jeb.91.1.73)
4. Kappel et al. MDPI ethogram Table 1 (all body postures): https://www.mdpi.com/2813-9372/1/3/21
5. Poradowski et al. 2024 withers-height means: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11598937/
6. Yoshikawa et al. 2023 beagle sit-to-stand joint ranges: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4421905
