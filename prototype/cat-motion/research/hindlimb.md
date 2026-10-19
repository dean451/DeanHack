# Cat hindlimb kinematics: walking (and trot) data for procedural animation

Compiled 2026-10-19.

## Read this first: how the data was collected, and its limits

- **No full texts were reachable.** In this session WebFetch failed DNS for every domain, and direct HTTPS was blocked by the egress proxy. Every number below comes from **WebSearch result text**: abstracts, table fragments and quoted sentences that the search engine pulled from the papers. **Nothing was digitized from figures**, because no figure could be opened.
- So a full ~10-point angle curve per joint, taken from a measured trajectory, is **NOT FOUND**. What is sourced is a set of **event values**: angle at paw contact (PC), at paw off (PO), and at peak swing flexion (F to E1), plus timing and duty-factor numbers.
- Section 1c gives a **CONSTRUCTED** 10-point curve that interpolates between the sourced event values using the sourced *qualitative* phase behaviour (Goslow 1973; Kuhtz-Buschbeck 1994). It is labelled as such and is **not measured data**.
- Tags:
  - **SOURCED**: the number appeared in search-returned text from the cited paper (where in the paper is noted).
  - **SOURCED-weak**: the number appeared in search text, but the text was garbled or the column or speed assignment is uncertain. Verify before relying on it.
  - **ESTIMATED / CONSTRUCTED**: my interpolation or arithmetic, not from a paper.
- Top priority if anyone can get library access: Goslow et al. 1973 (Figs/tables of angle vs time for walk, trot and gallop), and Table 2 of Smith et al. 1998 and Gregor et al. 2006 (full level-walking rows).

---

## 0. Angle conventions (needed to convert the values)

| Source | Convention | Tag |
|---|---|---|
| Goslow et al. 1973 | Instantaneous joint angles of lower spine, hip, knee, ankle and MTP from single film frames. Cycle divided into Philippson phases F, E1 (swing) and E2, E3 (stance). | SOURCED (abstract) |
| Lecomte et al. 2021 (Frigon lab) | Interior (included) angles. **A decreasing angle means flexion at hip and knee, and dorsiflexion at ankle and MTP.** Hip angle is pelvis (iliac crest)–hip–knee; ~180° would be a straight segment line. | SOURCED (Methods text, per search) |
| Smith/Carlson-Kuhta/Trank 1998 (I–III), Gregor et al. 2006 | Joint angles computed from elevation angles of adjacent segments. **MTP values above 180°** (e.g. PO 202°): the angle is measured on the dorsal side, so >180° means the toes are bent dorsally relative to the metatarsus (the "standing on tiptoe" toe break). | SOURCED (methods text); the dorsal-side reading is my interpretation of >180° values |
| Kuhtz-Buschbeck et al. 1994 (X-ray) | MTP ~230° to ~270° and PIP ~75°: a different reference, likely a 0–360° signed convention. **Not directly comparable** to the other sources. Use the *excursion* (~40° MTP extension over stance), not the absolute values. | SOURCED (abstract) |
| Model convention (Frontiers Bioeng. 2022 neuromusculoskeletal model) | Straight-limb reference: hip 135°, knee 180°, ankle 180°. Not data. | SOURCED (model definition) |

**Converting to a rig:** if a bone's rest pose is straight (0° rotation), then rig flexion = 180° − interior angle for knee and ankle. Do the hip relative to your pelvis bone's axis. For the MTP in the Smith convention, toe dorsiflexion = angle − 180°.

---

## 1. Joint angles across the cycle (level walking)

0% = paw contact (PC). Stance ≈ 0–60/65%, swing ≈ 60/65–100% at 0.5–0.8 m/s (see section 2).

### 1a. Sourced event values, level walking (interior angles, degrees)

| Joint | Paw contact (0%) | Peak swing flexion (F to E1, ~70–80%) | Paw off / liftoff (~60–65%) | Speed / setup | Tag and location |
|---|---|---|---|---|---|
| Hip | **~92** | **91 ± 8** (peak flexion in swing) | **135.2 ± 13.7** (Expresso) / **135.7 ± 13.6** (DLC) | Treadmill. Lecomte: example cat at 0.4 m/s. Gregor: level walking. | Lecomte 2021 Table 1 (PO, SOURCED). PC ~92: SOURCED-weak (search summary of the same paper). Peak flexion: Gregor 2006 Table 2, SOURCED. |
| Hip | – | **105 ± 6** at the F–E1 transition | **136 ± 4** | Treadmill, level (0% grade) | Smith et al. 1998 Part III Table 2, 0% column. SOURCED-weak (OCR-garbled table). |
| Knee | **115.0 ± 6.4** (Expresso) / **115.2 ± 5.9** (DLC) | **98 ± 9** | **118.4 ± 11.5** / **121.0 ± 11.0** | As above | Lecomte 2021 Table 1, SOURCED. Peak flexion: Gregor 2006 Table 2 "level" column, SOURCED-weak (seen in a secondary snippet). |
| Ankle | **~115** | **102 ± 9** | **~139** | As above | Lecomte 2021: SOURCED-weak (search summary). Gregor 2006 Table 2: SOURCED-weak. |
| MTP | **154.1** (Expresso) / **154.1** (DLC) | – | **155.0** / **156.1** | Lecomte; table speed not confirmed (the example trace is 0.4 m/s) | Lecomte 2021 Table 1, SOURCED |
| MTP (Smith convention, >180 = toes dorsiflexed) | – | **190 ± 7** at F–E1 | **202 ± 6** | Treadmill, level | Smith et al. 1998 Part III Table 2, SOURCED-weak |
| MTP (X-ray convention) | **~230** at touch-down | – | **~270** at the end of stance, then rapid flexion **~50 ms before lift-off** | Treadmill | Kuhtz-Buschbeck 1994 abstract, SOURCED |
| PIP (toe) | **~75**, held roughly constant through stance | Flexes slowly in mid-swing | – | Treadmill | Kuhtz-Buschbeck 1994, SOURCED |

**Caveat on "liftoff" in Lecomte 2021:** liftoff is defined as *the frame with the most caudal displacement of the toe*, not when the toe actually leaves the ground. Contact is the first frame of visible paw contact. Halbertsma 1983 uses the same stance definition (PC to most caudal paw position). That is why the Lecomte MTP is only ~155° at "liftoff": the true toe-off, with full MTP dorsiflexion (Smith 202°; X-ray ~270°), comes slightly later.

Excluded: a PMC table returned by search gave level-walking means of hip ~99, knee ~135, ankle ~148 and MTP ~156. I could not confirm the species or protocol, so it is not used.

### 1b. Sourced qualitative phase behaviour (what each joint does when)

| Phase (Philippson) | Window | Hip | Knee | Ankle | MTP / toes | Source |
|---|---|---|---|---|---|---|
| **E2 (yield)** | Stance, from PC to ~midstance | **Extends** | **Flexes (yields)** under load | **Flexes (yields)** under load | MTP extends slowly. PIP flexes rapidly at contact, then holds ~75°. | Goslow 1973: hip **out of phase** with knee and ankle in E1 and E2. Kuhtz-Buschbeck 1994: "ankle and knee yielded under body weight". SOURCED. |
| **E3 (propulsion)** | Midstance to PO | Extends | Extends | Extends (greatest ankle extension) | MTP extends to its maximum, then flexes fast ~50 ms before lift-off | Goslow 1973: all three joints **in phase** in E3. Kuhtz-Buschbeck 1994. SOURCED. |
| **F (flexion)** | PO to peak knee/ankle flexion (~first half of swing) | Flexes | Flexes | Flexes | Toes flex | Goslow 1973: all in phase in F. SOURCED. |
| **E1** | Peak flexion to PC (late swing) | **Keeps flexing** (out of phase) | **Extends** | **Extends** | PIP flexes slowly mid-swing | Goslow 1973. Kuhtz-Buschbeck 1994. SOURCED. |

Timing of joint velocity peaks (Wisleder et al. 1990, 0.35–3.5 m/s): knee-extension velocity peaks **early in E1** and rises linearly with speed. Hip-flexion velocity peaks **late in F**. Hip and knee excursions are similar for walk and trot. After the trot–gallop transition, hip excursion becomes smaller and knee excursion larger. SOURCED (abstract).

Ankle yield magnitude in degrees: **not found**. In neurectomized spinal cats, yield is maximal at phase ~0.3 after foot contact. Normal cats showed "very little ankle yield" in that preparation (Bouyer et al. 2001), which suggests that in intact level walking the ankle yield is modest. SOURCED (qualitative).

### 1c. CONSTRUCTED 10-point walking curve (NOT measured; for a first-pass rig only)

Assumes a 0.6–0.7 m/s walk, cycle ~0.7 s, PO at 62%. Anchors (bold) come from 1a. Everything else is **ESTIMATED** by interpolating with the 1b phase behaviour. Yield depth (~5–10°) is a placeholder guess, because no measured value was found. **Replace this table when real curves are digitized.**

| % cycle | Phase | Hip | Knee | Ankle | MTP (Lecomte convention, <180 = dorsiflexed) |
|---|---|---|---|---|---|
| 0 (PC) | E2 start | **92** | **115** | **115** | **154** |
| 10 | E2 | 100 | 108 | 108 | 152 |
| 20 | E2→E3 | 110 | 107 | 108 | 150 |
| 30 | E3 | 118 | 110 | 115 | 148 |
| 40 | E3 | 125 | 114 | 125 | 146 |
| 50 | E3 | 131 | 118 | 133 | 145 |
| 62 (PO) | F start | **135** | **118–121** | **139** | **155** at "most caudal toe"; true toe-off is more dorsiflexed (no Lecomte-convention value found) |
| 70 | F | 115 | 105 | 115 | 165 |
| 80 | F→E1 (peak knee/ankle flex) | 100 | **98** | **102** | 165 |
| 90 | E1 | **91** (hip peak flexion, late swing) | 108 | 110 | 160 |
| 100 | = 0 | 92 | 115 | 115 | 154 |

Trot joint-angle table: **not found** (Goslow 1973 contains trot data but could not be accessed). Sourced qualitative statements: hip and knee excursions during swing are similar for walk and trot (Wisleder 1990). Over 0.33–1.19 m/s several cat limb angles are "effectively constant" (later paper citing Kuhtz-Buschbeck 1994, probably Fischer et al. 2002). So the walking curve shape is a reasonable starting point for a trot, with the time warping described in section 2.

---

## 2. Phase timing and duty factor

### 2a. Philippson phases

| Item | Value | Tag and location |
|---|---|---|
| Definitions | F = PO to peak knee/ankle flexion. E1 = peak flexion to PC. E2 = PC to ~midstance, with knee and ankle yield. E3 = midstance to PO. | SOURCED (Goslow 1973 abstract; Smith-lab papers) |
| Phase boundaries as % of cycle | **Not found as numbers.** One source notes that Philippson's scheme is often "simplified by giving equal allotments of time to each phase" (25/25/25/25), which is not measured. | – |
| Change with speed | E3 shortens the most, E2 and E1 a little, F "virtually no reduction". As a % of the cycle, F and E1 *increase* with speed (F the most). | SOURCED (Goslow 1973 abstract) |
| F share of swing on slopes | From level walking to a 25% upslope, the % of swing spent in flexion increased at all joints except the hip. | SOURCED (Carlson-Kuhta et al. 1998 abstract, values not seen) |

### 2b. Durations, duty factor vs speed

| Speed | Gait / setup | Cycle | Stance | Swing | Hindlimb duty factor | Tag and location |
|---|---|---|---|---|---|---|
| 0.6–0.8 m/s | Walk (standardized from Goslow 1973 + Halbertsma 1983) | **~700 ms** | ~490 ms (my arithmetic) | **~30% of cycle** (≈210 ms, my arithmetic) | ~0.70 (my arithmetic) | Yakovenko et al. 2002, J Neurophysiol 87:1542. SOURCED for 700 ms and 30%; durations ESTIMATED from them. |
| 0.61–0.63 m/s (range 0.54–0.74) | Overground, pressure walkway, 18 cats | – | – | – | **0.549 (M), 0.545 (F)** | Verdugo et al. 2013, PMC table fragment, SOURCED-weak. Pressure-mat stance timing tends to read short. |
| ~0.6 m/s | Same paper (or a related table) | – | hind 0.25 s? | hind 0.28 s? | – | SOURCED-weak. The table source is unconfirmed and the numbers do not match the 0.55 DF. **Do not use.** |
| 0.5–0.8 m/s | Overground vs treadmill, 10 cats | Longer on treadmill | Longer on treadmill | Shorter on treadmill; roughly constant with speed | **~0.61 overground (range 0.54–0.67, 61.15 ± 2.92%)**; **~0.68 treadmill (range 0.59–0.74)** | Audet et al. 2026 J Neurophysiol (ahead of print). SOURCED-weak: the snippet's treadmill/overground labelling was ambiguous. |
| Regular walking (speed not given) | Overground walkway | – | – | **285 ± 5 ms** (hind); 253 ± 18 ms (fore) | – | SOURCED-weak. Seen in search text for the Beloozerova/Prilutsky ladder-vs-regular walking papers; exact paper unconfirmed. |
| Usual walk/trot | Treadmill | – | – | **~200 ms** "usual swing" | – | Treadmill gallop kinematics II (ScienceDirect, 1977), citing Goslow's group. SOURCED-weak. |
| **1.3–1.8 m/s** | Walk→trot | – | Flexor and extensor phase durations **converge** | – | **≈0.5** (my inference from convergence) | Goslow 1973, as cited in "Control of Locomotor Cycle Durations" (J Neurophysiol, doi 10.1152/jn.00991.2004). SOURCED for convergence; DF 0.5 is ESTIMATED. |
| Half-bound / gallop up a slope | – | **362 ms** | **56 ± 3%** | – | 0.56 | SOURCED-weak. A different study, authors unconfirmed. |
| < 0.4 m/s | Slow walk | Highly variable | – | – | – | Halbertsma 1983: "considerable increase in the variability of all measured intervals" below 40 cm/s. Intact cats cannot walk consistently on a treadmill below 0.3–0.4 m/s (eLife). SOURCED. |

Rules, all SOURCED (Halbertsma 1983; Frigon-lab papers 2014–2022; Goslow 1973):
- As speed rises, cycle duration falls **mainly because stance shortens**. Swing is "relatively unchanged".
- Halbertsma found that **no element is strictly constant**: swing does shorten a little.
- The stance-vs-cycle regression slope is much steeper than the swing-vs-cycle slope. A reanalysis found slightly curved fits beat linear ones. Regression coefficients: **not found**.
- Trot duty factor for cats as a number: **not found**. Hildebrand's convention (DF < 0.5 = running/trot) is all that was found. A content site claiming "trot 40–50%" has no primary citation and is not used.
- Footfall order in walking: lateral-sequence walk (LH, LF, RH, RF). Pace appears at the steepest downslopes (Smith 1998), and cats often pace on treadmills ("Why cats pace on the treadmill").

**Practical rig rule (ESTIMATED from the above):** hold swing at ~0.20–0.29 s and set stance = stride period − swing. That gives DF ≈ 0.70 at 0.6–0.8 m/s, falling to ≈ 0.5 at ~1.3–1.8 m/s (trot).

---

## 3. Swing paw trajectory

| Quantity | Value | Tag and location |
|---|---|---|
| Peak toe clearance (absolute, cm) | **Not found** | – |
| Obstacle stepping | Paw elevation over obstacles was **0.9–1.5 cm higher** than in normal strides (4 cats) | Chu et al. 2017, "Strategies for obstacle avoidance during walking in the cat", J Neurophysiol (PMC5539443). SOURCED |
| Ladder vs flat treadmill | Toe vertical displacement around mid-swing increased **~7 mm** in one cat | Ladder Treadmill paper (PMC6596526). SOURCED (single animal) |
| Lateral (frontal-plane) paw excursion in swing | **2–3 cm** | "Control of Frontal Plane Motion of the Hindlimbs in the Unrestrained Walking Cat", J Neurophysiol 2006 (doi 10.1152/jn.00370.2006). SOURCED |
| What is controlled | Vertical paw position is stabilized through **most of swing**; horizontal position only **early and late** in swing. Stable mid-swing vertical position is tied to paw clearance. | Klishko et al. 2014, J Neurophysiol 112:1376 (PMC4137248). SOURCED |
| Timing of max height (% of swing) | **Not found** as a number. Indirect: knee/ankle peak flexion (end of F) is the moment of maximum limb shortening, and F is described as about the first half of swing. Peak toe height co-varies with peak knee flexion and knee flexion velocity (gastrocnemius recruitment / knee-flexor denervation study). | SOURCED (qualitative). The "~40–50% of swing" figure is ESTIMATED. |
| Path shape | Not found as numbers. Qualitative: the toe is lifted by hip and knee flexion. The MTP flexes sharply ~50 ms before lift-off ("peel-off"). The paw is placed by knee and ankle extension in E1 while the hip is still flexing. | Kuhtz-Buschbeck 1994. Goslow 1973. SOURCED |

---

## 4. Citations

1. Goslow GE, Reinking RM, Stuart DG (1973). The cat step cycle: hind limb joint angles and muscle lengths during unrestrained locomotion. *J Morphol* 141:1–41. https://onlinelibrary.wiley.com/doi/10.1002/jmor.1051410102. Abstract-level claims only.
2. Halbertsma JM (1983). The stride cycle of the cat. *Acta Physiol Scand Suppl* 521. https://pubmed.ncbi.nlm.nih.gov/6582764/
3. Lecomte CG, Audet J, Harnie J, Frigon A (2021). A validation of supervised deep learning for gait analysis in the cat. *Front Neuroinform* 15:712623. https://www.frontiersin.org/journals/neuroinformatics/articles/10.3389/fninf.2021.712623/full (PMC8417424). Table 1.
4. Smith JL, Carlson-Kuhta P, Trank TV (1998). Forms of forward quadrupedal locomotion III: downslope and level walking. *J Neurophysiol* 79:1702–1716. https://journals.physiology.org/doi/full/10.1152/jn.1998.79.4.1702. Table 2, 0% column.
5. Carlson-Kuhta P, Trank TV, Smith JL (1998). Forms of forward quadrupedal locomotion II: upslope and level walking. *J Neurophysiol* 79:1687–1701. https://journals.physiology.org/doi/full/10.1152/jn.1998.79.4.1687
6. Gregor RJ, Smith DW, Prilutsky BI (2006). Mechanics of slope walking in the cat. *J Neurophysiol* 95:1397–1409. https://journals.physiology.org/doi/full/10.1152/jn.01300.2004. Table 2.
7. Kuhtz-Buschbeck JP, Boczek-Funcke A, Illert M, Weinhardt C (1994). X-ray study of the cat hindlimb during treadmill locomotion. *Eur J Neurosci* 6:1187–1198. https://pubmed.ncbi.nlm.nih.gov/7952299
8. Wisleder D, Zernicke RF, Smith JL (1990). Speed-related changes in hindlimb intersegmental dynamics during the swing phase of cat locomotion. *Exp Brain Res* 79:651–660. https://link.springer.com/article/10.1007/BF00229333
9. Yakovenko S, Mushahwar V, VanderHorst V, Holstege G, Prochazka A (2002). Spatiotemporal activation of lumbosacral motoneurons in the locomotor step cycle. *J Neurophysiol* 87:1542. https://journals.physiology.org/doi/full/10.1152/jn.00479.2001
10. Control of locomotor cycle durations (2005). *J Neurophysiol*. https://journals.physiology.org/doi/full/10.1152/jn.00991.2004. Cites Goslow for convergence at 1.3–1.8 m/s.
11. Verdugo MR et al. (2013). Kinetic and temporospatial parameters in male and female cats walking over a pressure sensing walkway. *BMC Vet Res* 9:129. https://bmcvetres.biomedcentral.com/articles/10.1186/1746-6148-9-129 (PMC3701551)
12. Audet J et al. (2026). Comparison of forelimb and hindlimb movements during treadmill and overground locomotion at different speeds in intact adult cats. *J Neurophysiol*, ahead of print. https://journals.physiology.org/doi/full/10.1152/jn.00240.2026
13. Klishko AN, Farrell BJ, Beloozerova IN, Latash ML, Prilutsky BI (2014). Stabilization of cat paw trajectory during locomotion. *J Neurophysiol* 112:1376–1391. https://pmc.ncbi.nlm.nih.gov/articles/PMC4137248/
14. Strategies for obstacle avoidance during walking in the cat (2017). *J Neurophysiol*. https://pmc.ncbi.nlm.nih.gov/articles/PMC5539443/
15. Ladder treadmill: a method to assess locomotion in cats. https://pmc.ncbi.nlm.nih.gov/articles/PMC6596526/
16. Control of frontal plane motion of the hindlimbs in the unrestrained walking cat (2006). *J Neurophysiol*. https://journals.physiology.org/doi/full/10.1152/jn.00370.2006
17. Bouyer LJG et al. (2001). Adaptive locomotor plasticity in chronic spinal cats after ankle extensors neurectomy. *J Neurosci* 21:3531. https://www.jneurosci.org/content/21/10/3531
18. Day LM, Jayne BC (2007). Interspecific scaling of the morphology and posture of the limbs during the locomotion of cats (Felidae). *J Exp Biol* 210:642–654. https://journals.biologists.com/jeb/article/210/4/642/17244/
19. Harnie J et al. (2022). State- and condition-dependent modulation of the hindlimb locomotor pattern in intact and spinal cats across speeds. *Front Syst Neurosci*. https://www.frontiersin.org/journals/systems-neuroscience/articles/10.3389/fnsys.2022.814028/full
20. Frigon A et al. (2014). Speed-dependent modulation of phase variations... intact adult cats. *J Neurophysiol* 111:1885. https://journals.physiology.org/doi/full/10.1152/jn.00524.2013

---

## 5. What an animator would likely get wrong

1. **The hip does not move with the knee and ankle.** In late swing (E1) the knee and ankle extend to reach for the ground while the **hip keeps flexing**. In early stance (E2) the **hip extends while the knee and ankle flex (yield)**. Only in F (early swing) and E3 (push-off) do all three move together (Goslow 1973). A rig that drives hip, knee and ankle from one "leg phase" sine will look robotic.
2. **Stance starts with a give, not a straight post.** Knee and ankle yield under body weight right after contact (E2), then extend in E3. The yield is modest in intact level walking (depth in degrees not found; placeholder 5–10°).
3. **The cat is a digitigrade tiptoe walker and the toe joint matters.** The MTP keeps extending (toes bent dorsally) throughout stance, up to ~40° of excursion in the X-ray data, then **snaps into flexion ~50 ms before lift-off**. The PIP holds ~75° in stance. The "heel" in the air is the ankle (hock) and should never touch down.
4. **Speed changes stance, not swing.** Do not scale the whole cycle uniformly with speed. Keep swing roughly fixed at ~0.2–0.29 s and shorten stance. Duty factor goes from ~0.6–0.7 at a 0.6–0.8 m/s walk toward ~0.5 near 1.3–1.8 m/s. Most of the stance lost is E3 (push-off); F barely changes.
5. **Joint angles barely change with speed or cat size.** Over 0.33–1.19 m/s, limb angles are "effectively constant". Felids from 3 kg to 192 kg do not walk with straighter limbs (Day & Jayne 2007). Speed comes from timing and stride length, not from straighter or deeper poses.
6. **Toe clearance is small.** Absolute height was not found, but obstacle steps add only ~1–1.5 cm, the ladder adds ~7 mm, and cats tightly control vertical paw height through swing. A high, "prancing" arc reads wrong. The paw also drifts 2–3 cm sideways in swing.
7. **Hindlimbs carry less weight than forelimbs** (~20% body weight per hindlimb vs ~30% per forelimb), so the forelimbs should look more loaded.
8. **"Liftoff" in many datasets is not the moment the toe leaves the ground.** Frigon-lab and Halbertsma stance ends at the most caudal paw position, so their "liftoff" angles come slightly before true toe-off. Do not set the swing start pose from them without adding the final MTP flex.
