# Domestic cat (Felis catus) gait data for procedural locomotion

Compiled 2026-10-19 for a low-poly browser-game cat that follows the player and picks walk / trot / gallop.

## How to read this file

- **SOURCED (ref)**: the number comes from the cited paper. **Every SOURCED number below was read from an abstract or a search-engine excerpt of the paper, not the full text.** WebFetch could not reach any host in this session (DNS failure on PMC, PLOS, Springer, Frontiers, Europe PMC). Check the numbers that matter most against the full texts (links in the references) before treating them as final.
- **ESTIMATED**: worked out by me from SOURCED numbers. The formula is always shown.
- **LOW-QUALITY**: from a non-peer-reviewed or secondary source (tracking guides, popular sites, an engineering paper quoting others). Use only as a plausibility check.
- **not found**: searched for and not found. No number is invented.

---

## 1. Body dimensions (for scaling)

| Quantity | Value | Status |
|---|---|---|
| Head-body length (nose to tail base), adult | 46–51 cm | LOW-QUALITY: Felidae Fund [R20]; same range on a serval comparison site [R21] |
| Shoulder (withers) height | 20–25 cm | LOW-QUALITY: Felidae Fund [R20] (23–25 cm in [R21]) |
| Hip height, normal treadmill walking | 23 cm (mean, 8 cats) | SOURCED: Trank, Chen & Smith 1996 [R9] |
| Hip height, crouched walking | 16 cm (30% lower) | SOURCED: [R9] |
| Body mass, adult crossbred cats | males 3.1–6.8 kg, females 3.3–4.75 kg | SOURCED: Verdugo et al. 2013 [R6] |
| Withers height from bone lengths (37 cats, regression equations) | coefficients exist, values not read | not found (equations are in Poradowski et al. 2024 [R22]; full text not reachable) |
| Effective leg length implied by Froude 0.5 at 1 m/s | h = v^2 / (Fr * g) = 1 / (0.5 * 9.81) = 0.20 m | ESTIMATED from [R5]. It matches the measured 23 cm hip height [R9] |

### Limb segments

| Segment | Value | Status |
|---|---|---|
| Scapula | 7.13 ± 0.25 (cm, units inferred) | SOURCED: Rahmati et al. 2024 preprint / 2025 J Physiol [R19] |
| Humerus | 9.95 ± 0.36 (cm) | SOURCED: [R19] |
| Radius | 9.17 ± 0.22 (cm) | SOURCED: [R19] |
| Carpals + metacarpals (combined) | 3.33 ± 0.19 (cm) | SOURCED: [R19] (metacarpals alone not reported) |
| Femur | 34.7 ± 1.0 % of hindlimb length | SOURCED: Day & Jayne 2007, domestic cats n=4 [R7] |
| Tibia | 32.4 % of hindlimb length (absolute: CT mean 111.61 mm, 95% CI 107.89–115.53 mm) | SOURCED: [R7]; absolute tibia from CT morphometry study [R23] |
| Metatarsals | 22.1 % of hindlimb length | SOURCED: [R7] (the remaining ~10.8% is presumably the toes; ESTIMATED as 100 − 34.7 − 32.4 − 22.1) |
| Absolute femur, metatarsal length | not found | — |
| Absolute femur ESTIMATED from tibia | 111.6 mm × 34.7/32.4 ≈ 120 mm | ESTIMATED (mixes two studies with different cats) |
| Absolute metatarsus ESTIMATED from tibia | 111.6 mm × 22.1/32.4 ≈ 76 mm | ESTIMATED (same caveat) |

Rig hint (ESTIMATED): forelimb chain scapula : humerus : radius : manus ≈ 7.1 : 10.0 : 9.2 : 3.3; hindlimb femur : tibia : metatarsus : toes ≈ 34.7 : 32.4 : 22.1 : 10.8.

---

## 2. Speed ranges per gait

Body-length speeds use a head-body length of 0.48 m (midpoint of the LOW-QUALITY 46–51 cm range), so every BL/s value is ESTIMATED: BL/s = (m/s) / 0.48.

| Gait | Speed (m/s) | BL/s (ESTIMATED) | Status / source |
|---|---|---|---|
| Walk (overground range) | 0.40–1.00 | 0.8–2.1 | SOURCED (secondary): pressure-walkway paper quoting Liu et al. 2020 and Qian et al. 2014 [R11] |
| Walk, preferred overground (pressure mat, self-selected) | mean 0.68, range 0.43–1.42 | 1.4 (0.9–3.0) | SOURCED: pressure-mat study, attributed to Stadig & Bergh 2015 [R12]; excerpt did not name the paper unambiguously, verify |
| Walk, accepted window in a walkway study | 0.54–0.74 (means 0.63 ± 0.06 males, 0.61 ± 0.04 females) | 1.1–1.5 | SOURCED: Verdugo et al. 2013 [R6] |
| Walk, felid kinematics study, domestic cat mean | 0.80 ± 0.03 | 1.7 | SOURCED: Day & Jayne 2007 Table 2 [R7] |
| Walk, self-selected on stationary treadmill | 2.32 ± 0.32 km/h = 0.64 ± 0.09 m/s | 1.3 | SOURCED: Mille et al. 2026 [R13] (m/s conversion ESTIMATED) |
| Walk, Goslow upper bound | "< 2 mph" = < 0.89 m/s | < 1.9 | SOURCED: Goslow et al. 1973 [R2] (conversion ESTIMATED) |
| Walk → trot transition | ≈ 1.0 (Froude ≈ 0.5) | ≈ 2.1 | SOURCED: Bishop, Pai & Schmitt 2008 [R5] |
| Trot | 1.2–2.0 | 2.5–4.2 | SOURCED (secondary): [R11] |
| Trot and gallop both seen at the same treadmill speed | 2.25 | 4.7 | SOURCED: Smith, Chung & Zernicke 1993 [R16] (compared trot and gallop steps at 2.25 m/s) |
| Trot → gallop transition, mass-predicted (4 kg) | 1.54 × 4^0.216 ≈ 2.1 | ≈ 4.3 | ESTIMATED from Heglund & Taylor 1988 equation [R15] (equation itself read from a scanned-PDF excerpt; may be garbled) |
| Trot → gallop transition, direct cat measurement | not found | — | — |
| Gallop (rotary, transverse, half-bound), treadmill, aversive control | 2.8–6.1 | 5.8–12.7 | SOURCED: Norgren, Seelhorst & Wetzel 1977 [R3] |
| Gallop, treadmill, food reward | 2.3–4.1 (one cat at 2.0) | 4.8–8.5 | SOURCED: Eisenstein et al. 1977 [R4] |
| Gallop, motion capture | 3.2 → 4.33 | 6.7–9.0 | SOURCED: Kim et al. 2014 [R17] |
| High-speed gallop (Goslow) | "> 16 mph" = > 7.2 m/s | > 15 | SOURCED: [R2] (conversion ESTIMATED) |
| Top speed | ~13.3 m/s (48 km/h) | ~28 | LOW-QUALITY: Wikipedia "Footspeed" and pet sites [R24]; no measured source found |
| Pace | treadmill artifact, not an overground gait | — | SOURCED: Blaszczyk & Loeb 1993 [R1]: cats on treadmills often pace (ipsilateral legs together), most often when at the front of the enclosure; overground they use diagonal coordination |
| Canter | not found for domestic cats | — | — |

Secondary cross-check (LOW-QUALITY, engineering paper quoting others): walk 0.54–0.74 m/s, trot 2.12 m/s, gallop 3.5 m/s [R25].

Notes:
- Walk and trot ranges overlap with nothing in between from 1.0 to 1.2 m/s; the transition is near 1 m/s [R5].
- Trot and slow transverse gallop overlap: Eisenstein et al. report "a continuum of interlimb coordination ... from trotting to this type of gallop" at low gallop speeds [R4]. Expect a fuzzy trot/gallop boundary around 2.0–2.5 m/s (ESTIMATED from [R4], [R15], [R16]).
- Treadmill vs overground: at matched speeds (0.5–0.8 m/s), treadmill cycle and stance are longer, swing is shorter, and steps/strides are shorter than overground [R10]. Prefer overground data for a game.

---

## 3. Stride length, stride frequency, duty factor vs speed

### Measured points (walk)

| Speed (m/s) | Stride length (m) | Stride time (s) | Stance (s) | Swing (s) | Duty factor | Source |
|---|---|---|---|---|---|---|
| 0.63 (males) | fore 0.49 ± 0.02; hind ~0.49 | fore 0.80 ± 0.09; hind 0.84 ± 0.13 | fore 0.48 ± 0.07; hind 0.46 | fore 0.34 ± 0.04; hind 0.40 ± 0.06 | fore 0.60, hind 0.55 (ESTIMATED = stance / stride time) | SOURCED: Verdugo et al. 2013 Table 3 [R6] |
| 0.61 (females) | fore 0.45 ± 0.02; hind ~0.44 | fore 0.76 ± 0.10; hind 0.82 ± 0.08 | fore 0.46 ± 0.07; hind 0.44 | fore 0.33 ± 0.03; hind 0.39 ± 0.04 | fore 0.61, hind 0.54 (ESTIMATED) | SOURCED: [R6] |
| 0.5–0.6 (treadmill) | 0.38–0.46 (ESTIMATED = speed × cycle) | 0.766 ± 0.030 | 70% of cycle | 30% of cycle | 0.70 | SOURCED: Trank et al. 1996 [R9] (same values for normal and crouched walking) |
| ~0.8 (felids incl. domestic) | not found | not found | — | — | grand mean 0.64 across felids; all cats DF > 0.50 (lateral-sequence walks) | SOURCED: Day & Jayne 2007 [R7] |

ESTIMATED stride frequency in the walk: 1 / 0.76–0.84 s ≈ 1.2–1.3 Hz at ~0.62 m/s [R6]; 1 / 0.766 s ≈ 1.3 Hz at 0.5–0.6 m/s on a treadmill [R9].

Consistency check (ESTIMATED): speed = stride length / stride time = 0.49 / 0.80 = 0.61 m/s, matching the measured 0.63 m/s [R6].

### Speed rules (qualitative, SOURCED)

- All step-cycle phases shorten as speed rises; stance (support/extension) shortens proportionally more than swing; each phase is roughly linear in total cycle duration (Halbertsma 1983 [R8]). Slopes not found in excerpts.
- Cycle and stance shorten with speed; swing stays relatively invariant (0.5–0.8 m/s, Frigon lab 2026 [R10]).
- Goslow 1973: from walk (< 2 mph) to gallop (> 16 mph) the four phases keep their order; speed mostly shortens E3 (late stance), little change in E1 and E2, almost none in F (swing flexion) [R2].
- Gallop (2.8–6.1 m/s): stride length increases "markedly and linearly" with speed; flight (zero support) percentage rises slightly; duty factor and other measures barely change with speed [R3]. In one cat (3.1–4.1 m/s) stride duration changed by only ~30 ms total [R4]. Gallop swing ~200 ms (cited in [R4] excerpt; treat as SOURCED-secondary).
- Stride frequency is negatively correlated with body mass across felids [R7].

### Allometric equations (all mammals, not cat-specific)

| Equation | Value for 4 kg cat | Status |
|---|---|---|
| Trot-gallop transition speed v = 1.54 M^0.216 m/s (M in kg) | 2.08 m/s | Equation SOURCED from Heglund & Taylor 1988 excerpt [R15] (scanned PDF, digits may be garbled); value ESTIMATED |
| Trot-gallop transition stride frequency f = 4.19 M^-0.150 Hz | 3.40 Hz | Same caveat [R15]; value ESTIMATED |
| Stride length at transition = v / f | 0.61 m | ESTIMATED |
| Preferred trot frequency f = 3.35 M^-0.13 Hz (refit of H&T data) | 2.80 Hz | SOURCED: refit cited on ResearchGate "Body size and the neural control of movement" [R26]; value ESTIMATED |
| Preferred gallop frequency f = 3.9 M^-0.16 Hz (refit) | 3.12 Hz | SOURCED [R26]; value ESTIMATED |

The original 1974 scaling paper (Heglund, Taylor & McMahon, Science 186:1112) [R14]: coefficients not found in excerpts.

### Not found

- Stride length/frequency equations as functions of speed for the cat walk and trot.
- Duty factor vs speed table for intact cats overground (only: spinal cats reach DF 0.5 at ~0.8–0.9 m/s on a treadmill, SOURCED but **spinal**, not intact [R18 excerpt]).
- Trot duty factor value: only "each limb contacts the ground for less than 50% of the cycle" in felid trotting (SOURCED: Feline Locomotion encyclopedia entry [R27]).

---

## 4. Footfall sequence and limb phase

| Gait | Footfall / phase | Status |
|---|---|---|
| Walk | Lateral-sequence walk, DF > 0.5: RH → RF → LH → LF | SOURCED: footfall order from a primate/nonprimate comparison figure [R28]; lateral sequence with DF > 50% for all felids in [R7] |
| Walk couplet type | Felids use either lateral-sequence diagonal-couplet or lateral-sequence lateral-couplet walks | SOURCED: Feline Locomotion [R27] |
| Walk, crouched/stealthy | Crouched postures go with more diagonality; diagonality correlates negatively with hip height and with energy recovery (all < 40%) | SOURCED: Bishop et al. 2008 [R5]. Numeric diagonality / limb phase values not found |
| Hildebrand phase (% hind-to-fore lag) for Felis catus | not found (a felid Hildebrand plot of phase vs hindlimb DF, 9 species, exists in [R27] citing Granatosky 2018) | not found |
| Interlimb phase, treadmill (decerebrate cats) | left-right homologous ~0.5; homolateral (same side) ~0.8; diagonal ~0.3 (fraction of cycle) | SOURCED: Miller et al. 1977 as quoted in [R18 excerpt]. Decerebrate, not intact |
| Interlimb phase, intact cats | Speed did not significantly change homolateral or diagonal coupling (0.5–0.8 m/s); overground had more out-of-phase homolateral coupling (+24.74%) and more in-phase diagonal coupling (+7.32%) than treadmill. Overground favours diagonal support; treadmill favours multi-limb support | SOURCED: Frigon lab 2026 [R10]. Absolute values not found |
| Trot | Diagonal pairs in synchrony; each limb on the ground < 50% of the cycle | SOURCED: [R27] |
| Pace | Ipsilateral legs together; seen on treadmills, not normal overground | SOURCED: [R1] |
| Gallop types used | Rotatory (rotary) gallop, transverse gallop and half-bound all observed in domestic cats | SOURCED: Norgren et al. 1977 [R3] |
| Gallop footfall timing | Forelimb touchdowns ~25% of stride apart; hindlimb touchdowns ~11% apart in rotary and transverse gallops, simultaneous in half-bound | SOURCED: [R3] |
| Gallop suspension | One flight (zero-support) phase per stride; flight % rises slightly with speed | SOURCED: [R3]. "Double suspension" claim exists only on pet sites (LOW-QUALITY [R24]) |
| Gallop duty factor | Varies little across the four limbs and the three gallop types | SOURCED: [R3]; numeric value not found |
| Most common felid gait transition | Trot → gallop | SOURCED: [R27] |
| Half-bound definition | No hind lead (hind feet land together) | SOURCED: Abourachid 2003 [R29] |

ESTIMATED Hildebrand-style parameters for animation (no measured cat value found; these are design defaults, not data):
- Walk: DF 0.60–0.70 from [R6], [R7], [R9]; lateral sequence, hind-to-fore same-side lag ~0.2–0.25 of cycle (ESTIMATED as 1 − 0.8 from the decerebrate homolateral phase in [R18]).
- Trot: DF just below 0.5 ([R27]); diagonal pairs at 0 lag.

---

## 5. Transitions, acceleration, stopping, turning, stalking

| Topic | Finding | Status |
|---|---|---|
| Start from rest (walk) | not found | not found |
| Leaping/burst start | Weight shifts onto the hindlimbs, placed one slightly ahead of the other; rapid hindlimb extension gives propulsion | SOURCED (textbook, descriptive): veteriankey "Feline Locomotive Behavior" [R30] |
| Number of steps to accelerate / stop | not found | not found |
| Deceleration to stop | not found | not found |
| Turning in a corridor | Cats took the widest arc available, then moved to the middle of the walkway; approaching an obstacle they shortened the two strides before it and changed direction on the last stride | SOURCED: Beloozerova lab obstacle-avoidance study [R31] |
| Turning gait / body rotation kinematics | not found | not found |
| Stalking / crouched walk, lab version | Walking under a ceiling 17–20 cm above the belt; hip height 23 → 16 cm (−30%); cycle 766 ± 30 ms; stance 70% / swing 30%; same timing as normal walk at 0.5–0.6 m/s | SOURCED: Trank et al. 1996 [R9] |
| Stealthy walking | Crouching and diagonality not associated with walking speed; energy recovery < 40% | SOURCED: Bishop et al. 2008 [R5] |
| Field stalking description | Crouched, head outstretched, slow approach that may speed up to a sprint; tense hold before a brief sprint | LOW-QUALITY (descriptive): International Cat Care [R32] |
| Stalk speed in the field | not found | not found |

---

## 6. Paw placement

| Topic | Finding | Status |
|---|---|---|
| Direct registering (hind paw lands in fore paw print) when walking | Cats "direct register" | LOW-QUALITY: NY DEC tracking guide [R33] |
| Over/understep | Walking bobcats on firm ground often overstep; understep linked to slower pace and stalking | LOW-QUALITY, bobcat not domestic cat [R34] |
| Trail width | 4–9 in (10–23 cm), step 6–14 in (15–36 cm) | LOW-QUALITY, **bobcat** [R34] |
| Domestic cat track width / base of support (cm) | not found (reported only as a figure in Farrell et al. 2015 "Accurate stepping on a narrow path" [R35]; narrow-path walking was slightly slower with more adducted limbs) | not found |
| Paw placement on treadmill vs overground | Paw contact more rostral (forward) on treadmill | SOURCED: [R10] |

---

## 7. Gaps (not found)

1. Hildebrand gait formula (DF + lateral phase %) measured for Felis catus walk and trot.
2. Duty factor vs speed curve for intact cats overground, and trot duty factor value.
3. Stride length / frequency as equations of speed for the cat walk and trot.
4. A direct measurement of the cat walk-trot speed beyond "around 1 m/s", and of the trot-gallop transition speed (only a mass-based estimate ~2.1 m/s and overlap at 2.25 m/s).
5. Gait initiation and termination: steps to reach a gait from rest, steps to stop.
6. Turning gait kinematics (body yaw per stride, inside/outside limb behaviour) in cats.
7. Field stalking speed and stride parameters.
8. Domestic cat track width in cm; direct registering only from tracking guides.
9. Absolute femur and metatarsal lengths; peer-reviewed head-body length and withers height.
10. Halbertsma 1983 speed range and regression slopes; Wetzel & Stuart 1976 numbers; Goslow 1973 per-phase durations.

---

## References (all URLs were the ones the search returned; full texts not opened)

- [R1] Blaszczyk J, Loeb GE (1993) Why cats pace on the treadmill. Physiol Behav 53:501–507. https://pubmed.ncbi.nlm.nih.gov/8451315/ ; https://www.sciencedirect.com/science/article/abs/pii/0031938493901445
- [R2] Goslow GE, Reinking RM, Stuart DG (1973) The cat step cycle: hind limb joint angles and muscle lengths during unrestrained locomotion. J Morphol 141:1–41. https://onlinelibrary.wiley.com/doi/10.1002/jmor.1051410102
- [R3] Norgren KS, Seelhorst E, Wetzel MC (1977) Kinematics of treadmill galloping by cats: I. Steady-state coordination under aversive control. Behav Biol. https://www.sciencedirect.com/science/article/abs/pii/S0091677377922799
- [R4] Eisenstein et al. (1977) Kinematics of treadmill galloping by cats: II. Steady-state coordination under positive reinforcement control. Behav Biol. https://www.sciencedirect.com/science/article/abs/pii/S0091677377922957
- [R5] Bishop KL, Pai AK, Schmitt D (2008) Whole body mechanics of stealthy walking in cats. PLoS ONE 3(11):e3808. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0003808 ; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2583958/
- [R6] Verdugo MR, et al. (2013) Kinetic and temporospatial parameters in male and female cats walking over a pressure sensing walkway. BMC Vet Res 9:129. https://pmc.ncbi.nlm.nih.gov/articles/PMC3701551/
- [R7] Day LM, Jayne BC (2007) Interspecific scaling of the morphology and posture of the limbs during the locomotion of cats (Felidae). J Exp Biol 210:642–654. https://journals.biologists.com/jeb/article/210/4/642/17244/Interspecific-scaling-of-the-morphology-and ; PDF mirror https://www.originalwisdom.com/wp-content/uploads/bsk-pdf-manager/2019/10/Day-and-Jayne_2007_Interspecific-scaling-of-the-morphology-and-posture-of-the-limbs-during-the-locomotion-of-cats-1.pdf
- [R8] Halbertsma JM (1983) The stride cycle of the cat. Acta Physiol Scand Suppl 521:1–75. https://pubmed.ncbi.nlm.nih.gov/6582764/ ; thesis https://repository.tudelft.nl/record/uuid:dce2cc79-0b36-4267-b0ca-5f590bef75ad
- [R9] Trank TV, Chen C, Smith JL (1996) Forms of forward quadrupedal locomotion. I. Normal and crouched walking. J Neurophysiol 76:2316–2326. https://pubmed.ncbi.nlm.nih.gov/8899606/
- [R10] Frigon lab (2026) Comparison of forelimb and hindlimb movements during treadmill and overground locomotion at different speeds in intact adult cats. J Neurophysiol, doi 10.1152/jn.00240.2026. https://journals.physiology.org/doi/full/10.1152/jn.00240.2026
- [R11] Pressure-sensitive walkway cat study (figure page; quotes Liu et al. 2020 and Qian et al. 2014 for walk 0.40–1.00 and trot 1.2–2.0 m/s). https://www.researchgate.net/figure/Cat-traversing-the-pressure-sensitive-walkway_fig2_341329450 ; also quoted in https://he01.tci-thaijo.org/index.php/tjvm/article/download/247175/167732
- [R12] Stadig SM, Bergh AK (2015) Gait and jump analysis in healthy cats using a pressure mat system. J Feline Med Surg 17:523–529. https://pmc.ncbi.nlm.nih.gov/articles/PMC10816797/
- [R13] Mille et al. (2026) Mode-dependent differences in kinetic and selected temporospatial gait parameters in healthy cats walking on a pressure-sensitive treadmill. Front Vet Sci, doi 10.3389/fvets.2026.1816089. https://pmc.ncbi.nlm.nih.gov/articles/PMC13536722/
- [R14] Heglund NC, Taylor CR, McMahon TA (1974) Scaling stride frequency and gait to animal size: mice to horses. Science 186:1112–1113. https://www.semanticscholar.org/paper/0279730cab562ebe698d6d7bf44edb54032d6a1e
- [R15] Heglund NC, Taylor CR (1988) Speed, stride frequency and energy cost per stride. J Exp Biol 138:301–318. https://www.originalwisdom.com/wp-content/uploads/bsk-pdf-manager/2019/10/Heglund-and-Taylor_1988_Speed-and-stride-frequency-and-energy-cost-per-stride-how-do-they-change-with-body-size-and-gait.pdf
- [R16] Smith JL, Chung SH, Zernicke RF (1993) Gait-related motor patterns and hindlimb kinetics for the cat trot and gallop. Exp Brain Res 94:308–322. https://link.springer.com/article/10.1007/BF00230301
- [R17] Kim et al. (2014) The role of relative spinal motion during feline galloping for speed performance. J Bionic Eng 11:517–528. https://link.springer.com/article/10.1016/S1672-6529(14)60064-0
- [R18] Frigon A, et al. (2014) Speed-dependent modulation of phase variations ... in intact adult cats. J Neurophysiol 111:1885–1902. https://journals.physiology.org/doi/full/10.1152/jn.00524.2013 ; split-belt companion (speeds 0.3–1.0 m/s) https://pmc.ncbi.nlm.nih.gov/articles/PMC4200011/ ; decerebrate phase values (Miller et al. 1977) and spinal DF 0.5 at 0.8–0.9 m/s came from search excerpts of this group's papers, e.g. https://journals.physiology.org/doi/full/10.1152/jn.00978.2016
- [R19] Rahmati et al. (2025) Role of forelimb morphology in muscle sensorimotor functions during locomotion in the cat. J Physiol. https://physoc.onlinelibrary.wiley.com/doi/full/10.1113/JP287448 ; preprint table https://www.biorxiv.org/content/10.1101/2024.07.11.603106v1.full.pdf
- [R20] Felidae Fund, Domestic cat. https://felidaefund.org/learn/cats/domestic-cat
- [R21] Serval size comparison page. https://www.wildcatsofafrica.info/african-serval-cat/serval-cat-size-with-comparison-to-domestic-cats-and-lions/
- [R22] Poradowski et al. (2024) Estimation of height at withers based on long bone measurements of living cats. Vet Sci 11:522. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11598937/
- [R23] Morphometric description of the feline tibia using 3D CT. https://www.researchgate.net/publication/382909809_Morphometric_description_of_the_feline_tibia_using_three_-_dimensional_computed_tomography
- [R24] Footspeed (Wikipedia) https://en.wikipedia.org/wiki/Footspeed ; pet-site gallop claims e.g. https://www.catster.com/lifestyle/how-do-cats-run/
- [R25] Feedback linearization based tracking control of a tilt-rotor with cat-trot gait plan (engineering paper quoting cat speeds). https://arxiv.org/pdf/2202.02926
- [R26] Body size and the neural control of movement (ResearchGate; refit of Heglund & Taylor data). https://www.researchgate.net/publication/224938781_Body_size_and_the_neural_control_of_movement
- [R27] Feline Locomotion, Encyclopedia of Animal Cognition and Behavior (Springer). https://link.springer.com/rwe/10.1007/978-3-319-47829-6_1766-1 ; https://www.researchgate.net/publication/344595815_Feline_Locomotion
- [R28] Footfall sequence in primate and nonprimate (image, nonprimate lateral sequence RH-RF-LH-LF). https://www.eurekalert.org/multimedia/616431
- [R29] Abourachid A (2003) Contribution to the analysis of gaits: practical elements to complement the Hildebrand method. C R Biol. https://www.sciencedirect.com/science/article/pii/S1631069103003512
- [R30] Feline Locomotive Behavior (veterinary textbook chapter). https://veteriankey.com/feline-locomotive-behavior/
- [R31] Strategies for obstacle avoidance during walking in the cat (J Neurophysiol 2017; corridors 2.5 m long, 25 or 15 cm wide). https://journals.physiology.org/doi/full/10.1152/jn.00033.2017
- [R32] International Cat Care, Understanding the hunting behaviour of cats. https://icatcare.org/articles/understanding-the-hunting-behaviour-of-cats
- [R33] NY DEC animal tracks guide. https://extapps.dec.ny.gov/docs/administration_pdf/tracks1.pdf
- [R34] Bobcat tracks and trail patterns. https://winterberrywildlife.ouroneacrefarm.com/2021/06/05/bobcat-tracks-and-trail-patterns/
- [R35] Farrell BJ, et al. (2015) Accurate stepping on a narrow path: mechanics, EMG, and motor cortex activity in the cat. J Neurophysiol. https://pmc.ncbi.nlm.nih.gov/articles/PMC4644224/
