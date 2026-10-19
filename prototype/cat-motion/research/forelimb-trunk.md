# Cat forelimb, scapula, trunk, head and tail motion: measured data for procedural locomotion

Compiled 2026-10-19 for a low-poly procedural cat (DeanHack).

## How to read this file (important caveats)

- **Access limits.** In this session, direct page fetching (WebFetch/curl) was blocked by the network proxy for every research host tried (PMC, bioRxiv, journals.biologists.com, Wiley, PLOS, Semantic Scholar, archive.org). Only a web-search tool worked. **Every number below therefore comes from an abstract or abstract-level text that the search tool quoted.** No full text, table or figure was opened, and nothing was digitized.
- **Labels.**
  - `SOURCED-ABS`: the number appears in the paper's abstract or summary text as quoted by the search tool. The page/table is not known. Check it against the full text before you hard-code it.
  - `SOURCED-SEC`: the number comes from a later paper that cites the original (secondary).
  - `ESTIMATED`: not used. No figure was digitized, so nothing in this file is digitized.
  - `not found`: searched for, but no measured value turned up.
- I made up no numbers. Where a value is missing, the cell says "not found".
- **Angle conventions.** Each table says which convention its source uses. The Caliebe et al. distal-joint angles use a 0-360 degree convention in which values above 180 mean dorsiflexion/hyperextension. The exact zero reference was not visible in the abstract.

---

## 1. Forelimb joint angles over the step cycle

### 1a. Distal forelimb (wrist, MCP, PIP): treadmill walking, X-ray

Source: Caliebe F, Häussler J, Hoffmann P, Illert M, Schirrmacher J, Wiedemann E (1991). *Cat distal forelimb joints and locomotion: an X-ray study.* Eur J Neurosci 3(1):18-31. https://pubmed.ncbi.nlm.nih.gov/12106265/ ; https://onlinelibrary.wiley.com/doi/10.1111/j.1460-9568.1991.tb00807.x

Convention: joint angles from 0 to 360 degrees, measured on the same side each time. 180 = straight. Wrist ~200 means the wrist is slightly hyperextended (dorsiflexed) under load. MCP 240 to 300 means the toes are strongly dorsiflexed relative to the metacarpals, as in digitigrade stance. The paper's exact side convention was not visible in the abstract.

| Joint | Event / phase | Value | Status |
|---|---|---|---|
| Wrist (carpus) | Stance: held roughly constant | ~200 deg | SOURCED-ABS |
| PIP (proximal interphalangeal) | Stance: held roughly constant | ~60 deg | SOURCED-ABS |
| MCP | Touch-down | ~240 deg | SOURCED-ABS |
| MCP | End of stance (extends continuously through stance) | ~300 deg | SOURCED-ABS |
| Wrist + MCP | Just before lift-off | rapid flexion begins (angle value not in abstract) | SOURCED-ABS (timing only) |
| Wrist + MCP | ~150 ms after lift-off | flexion turns into slow extension (pre-landing reach) | SOURCED-ABS |
| Radioulnar (pronation/supination) | Swing and stance | rotations present; magnitude not found | SOURCED-ABS (qualitative) |
| Wrist peak flexion in swing | swing | not found | not found |

Animation meaning: during stance the wrist is a locked, slightly hyperextended strut. Nearly all distal "roll-over" happens at the MCP, which goes through about 60 deg of extra dorsiflexion as the body passes over the paw. At lift-off the wrist folds quickly, which gives the cat's typical paw "flick" or tuck, and it re-extends early in swing.

### 1b. Shoulder and elbow: sagittal joint angles

| Item | Value | Status / source |
|---|---|---|
| Shoulder and elbow angle trajectories, overground walking, 7 cats (3.20 ± 0.34 kg), 211 cycles (count per search snippet) | Plotted in Fig. 4A-C. The text says the patterns are "typical for cat walking". Numeric ranges were not visible. Shoulder and elbow both reach their minimum (most flexed) during **swing**. | Rahmati SM, Klishko AN, ... Prilutsky BI (2025) *Role of forelimb morphology in muscle sensorimotor functions during locomotion in the cat.* J Physiol. https://physoc.onlinelibrary.wiley.com/doi/full/10.1113/JP287448 ; preprint https://www.biorxiv.org/content/10.1101/2024.07.11.603106v1.full : qualitative SOURCED-ABS, **numbers not found** |
| Shoulder joint pattern per cycle | **Biphasic**: two flexion-extension alternations per step cycle | English AW (1978) *Functional analysis of the shoulder girdle of cats during locomotion.* J Morphol 156(2):279-292. https://onlinelibrary.wiley.com/doi/abs/10.1002/jmor.1051560209 : SOURCED-ABS (qualitative) |
| Elbow vs knee | Elbow and knee flex and extend in opposite directions (the elbow points back, the knee points forward) | Rahmati et al. 2025 (above): SOURCED-ABS (qualitative) |
| Elbow, wrist, MCP moments | Mostly extensor moments, peaking around mid-stance | Prilutsky lab full-body biomechanics (Prilutsky, Sirota, Gregor, Beloozerova 2005, J Neurophysiol), via https://www.researchgate.net/publication/7851832 : SOURCED-ABS (moment, not angle) |
| Shoulder angle range (deg) | not found | not found |
| Elbow angle range (deg), stance yield (deg) | not found | not found |
| Felid joint angles at footfall/midstance (9 species incl. domestic cat) | Exist in Day & Jayne 2007 tables. Posture is crouched and similar across body sizes. Only 3 of 24 angular variables changed with mass. The limb is most erect at midstance, with the paw nearly under the limb attachment point. Degree values were not visible. | Day LM, Jayne BC (2007) J Exp Biol 210:642-654. https://journals.biologists.com/jeb/article/210/4/642/17244/ : qualitative SOURCED-ABS, numbers not found |

### 1c. Scapula (no bony clavicular strut, so the scapula slides and rotates on the thorax)

| Item | Value | Status / source |
|---|---|---|
| Scapula rotation pattern | **Monophasic** flexion/extension (one swing back and forth per stride) on the thorax | English 1978 (above): SOURCED-ABS |
| Scapular pivot (fulcrum) | Near the **vertebral (dorsal) border**, at the medial end of the scapular spine. The scapula swings like a pendulum hung from its top edge, and the glenoid (shoulder joint) moves the most. | Boczek-Funcke A, Kuhtz-Buschbeck JP, Illert M (1996) *Kinematic analysis of the cat shoulder girdle during treadmill locomotion: an X-ray study.* Eur J Neurosci 8:261-272. https://pubmed.ncbi.nlm.nih.gov/8714697/ : SOURCED-ABS |
| Other scapular components (relative to the Th4 spinous process) | (1) flexion/extension about the dorsal fulcrum; (2) **vertical up/down translation**, monophasic; (3) abduction/adduction in swing vs stance; (4) small rotation about the scapular spine axis | Boczek-Funcke et al. 1996: SOURCED-ABS |
| Loading response | The scapula **yields (sinks) relative to the trunk** under body weight after ground contact | Boczek-Funcke et al. 1996: SOURCED-ABS |
| Speed range studied | 0.33 to 1.2 m/s treadmill, 2 cats, implanted markers, 20 ms X-ray frames | Boczek-Funcke et al. 1996: SOURCED-ABS |
| Glenoid path | A cyclical, **semilunar (crescent) path** of the glenoid in the parasagittal plane, fairly constant over a wide range of speeds | Miller S, van der Meché FGA (1975) *Movements of the forelimbs of the cat during stepping on a treadmill.* Brain Res. https://www.sciencedirect.com/science/article/abs/pii/0006899375905466 : SOURCED-ABS |
| Shoulder girdle and step length | Rotation and translation of the shoulder girdle combine to **increase step length** | English 1978: SOURCED-ABS |
| Scapula's share of forelimb step length, small therian mammals (cat not among the species) | Proximal segments (scapula and femur) produce **> 50%** of propulsive limb movement at symmetrical gaits. Scapula's contribution across therians: **43-73%** of step length. Forelimb kinematics stay similar across speed and gait, with the scapula dominant. | Fischer MS, Schilling N, Schmidt M, Haarhaus D, Witte H (2002) *Basic limb kinematics of small therian mammals.* J Exp Biol 205:1315-1338, https://journals.biologists.com/jeb/article/205/9/1315/8896/ (SOURCED-ABS for > 50%). The 43-73% range is from Fischer & Blickhan 2006 (J Exp Zool 305A:935-952, https://onlinelibrary.wiley.com/doi/10.1002/jez.a.333), as quoted in the tamandua paper https://journals.biologists.com/jeb/article/225/12/jeb243625/275699/ : SOURCED-SEC. **Not cat-specific.** |
| Scapular rotation amplitude in degrees, cat walking | **not found** (likely in English 1978 or Boczek-Funcke 1996 full text) | not found |
| Scapular vertical translation in mm, cat | not found | not found |
| Scapula height change in the stance limb while the other forelimb swings (obstacle study) | "slight increase" in height just before and during contralateral swing | Obstacle-stepping study surfaced by search (citation not resolved): qualitative only |

---

## 2. Trunk

| Item | Value | Status / source |
|---|---|---|
| Vertical displacement of withers vs hips (cat) | not found | not found |
| CoM vertical oscillation (cat) | Cats' low energy recovery was **not** explained by reduced vertical CoM oscillation. Amplitude not visible. | Bishop KL, Pai AK, Schmitt D (2008) *Whole body mechanics of stealthy walking in cats.* PLoS ONE 3(11):e3808. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0003808 : qualitative SOURCED-ABS |
| Mechanical energy recovery, walking cats | mean **17.6 ± 11.3 %** (n = 6), max **37.9 %**. Recovery does not change with speed. | Bishop et al. 2008: SOURCED-ABS |
| Spine lateral bending (deg) | not found. Upslope walking increases "horizontal" spinal movement and reduces lateral spinal movement compared with level walking. | Wada N, Kanda K et al., *Trunk movements and EMG activity in the cat: level versus upslope walking* (Prog Brain Res 2004 chapter), https://pubmed.ncbi.nlm.nih.gov/14653162/ : qualitative SOURCED-ABS |
| Spine pitch (sagittal flexion) | not found | not found |
| Pelvis roll / yaw (cat, normal walking) | not found | not found |

Generic quadruped note, **not cat data**: veterinary references on equine and canine gait describe head, withers and sacrum vertical motion as sinusoidal with **2 oscillations per stride** at the walk and the trot (https://veteriankey.com/the-neck-and-back/). Use this only as a frequency rule (twice per stride), not as an amplitude.

---

## 3. Head

Source: Zubair HN, Beloozerova IN, Sun H, Marlinski V (2016) *Head movement during walking in the cat.* Neuroscience 332:101-120. https://www.sciencedirect.com/science/article/pii/S0306452216302615 ; full text https://pmc.ncbi.nlm.nih.gov/articles/PMC4986613/

Conditions: level straight path, in light and in darkness.

| Quantity | Frequency | Amplitude | Status |
|---|---|---|---|
| Vertical translation | **2x per stride** | **~1.5 cm peak-to-peak** | SOURCED-ABS |
| Pitch rotation | **2x per stride** | **~3 deg** (abstract says "amplitude"; peak vs peak-to-peak not stated) | SOURCED-ABS |
| Peak pitch angular velocity | — | **20-50 deg/s** | SOURCED-ABS |
| Fore-aft translation | **2x per stride** | not found | SOURCED-ABS (freq) |
| Lateral (left-right) translation | **1x per stride** | **~1 cm peak-to-peak** | SOURCED-ABS |
| Roll rotation | **1x per stride** | **~1.5-3 deg** | SOURCED-ABS |
| Yaw rotation | **1x per stride** | not found | SOURCED-ABS (freq) |
| Forward acceleration vs other components | — | 25-100% larger | SOURCED-ABS |
| Mean head attitude | — | roll neutral; **nose down 10-30 deg** (horizontal canals and utricles held within 10 deg of earth-horizontal) | SOURCED-ABS |
| Control | — | Head is **actively held**. Reflexes play only part of the role. | SOURCED-ABS |
| Head vertical motion relative to withers/trunk bob | not found (the cat paper does not give a trunk reference in the abstract) | not found | not found |

Related: Zubair et al. 2019, *Gaze coordination with strides during walking in the cat*, J Physiol. https://pmc.ncbi.nlm.nih.gov/articles/PMC9260858/ : gaze behaviour is locked to the stride, even in darkness (qualitative). Walking cats keep a **constant downward gaze angle relative to the body** much of the time, with the eyes centred in the orbits, so head attitude ≈ gaze (from a cat gaze study surfaced by search, https://www.sciencedirect.com/science/article/abs/pii/S0166432802000967 , Fowler & Sherk-type gaze-during-locomotion work: qualitative).

---

## 4. Tail

| Item | Value | Status / source |
|---|---|---|
| Tail motion during steady, self-paced walking | Tail **largely immobile**. It does not appear to take part in balance during self-generated movement. Carried rigidly erect when crossing a stable plank. | Walker C, Vierck CJ Jr, Ritz LA (1998) *Balance in the cat: role of the tail and effects of sacrocaudal transection.* Behav Brain Res 91(1-2):41-47. https://www.sciencedirect.com/science/article/abs/pii/S0166432897001010 (PMID 9578438): SOURCED-ABS |
| Tail response to a perturbed (laterally moving) walkway | Active tail movement **opposite** to the runway displacement, independent of the hindlimbs. Lateral deviations typically **< 15 deg** to either side. | Walker et al. 1998: SOURCED-ABS |
| Tail oscillation amplitude/phase in normal walking | not found | not found |

Animation meaning: for steady walking, keep the tail almost static, with a held carriage pose plus at most a small passive lag. Reserve large lateral swings for balance events, turns and jumps, and swing it opposite the body's lateral displacement.

---

## 5. Gait timing, interlimb phase, footfalls, track

### 5a. Footfall sequence and phase

| Item | Value | Status / source |
|---|---|---|
| Walking footfall sequence | **Lateral-sequence walk** (LH -> LF -> RH -> RF), duty factor > 50% | Day & Jayne 2007 (above): SOURCED-ABS; felids use LS diagonal-couplet or LS lateral-couplet walks (Feline Locomotion review, https://www.researchgate.net/publication/344595815_Feline_Locomotion : SOURCED-SEC) |
| Diagonality (Hildebrand: % of stride by which an ipsilateral forefoot follows the hindfoot) | Often **close to 25%** (evenly spaced, "singlefoot" walk). Unusually **large variation** between strides compared with other mammals. More crouched posture gives higher diagonality and lower energy recovery. | Bishop et al. 2008: SOURCED-ABS |
| Homolateral (same-side fore-hind) and diagonal phase, treadmill | homolateral **~0.8**, diagonal **~0.3** (fraction of cycle). **Reference limb not verified.** In the Frigon lab the phase is the time between contacts divided by the reference-limb cycle, but different papers use different reference limbs (2026: hindlimb). If the forelimb is the reference, homolateral 0.8 means the hindlimb lands 0.8 of a cycle after its forelimb, i.e. **the forelimb lands ~0.2 of a cycle after its ipsilateral hindlimb**. That matches a lateral-sequence walk with Hildebrand limb phase ~20%. | Hurteau MF, Thibaudier Y, Dambreville C, Danner SM, Rybak IA, Frigon A (2018) J Neurosci 38(17):4104-4122. https://www.jneurosci.org/content/38/17/4104 : value quoted by search tool in a summary. Treat as **SOURCED-ABS, unverified convention**. |
| Homolateral phase defining a pace | 0-0.12 (used by Blaszczyk & Loeb to label pacing; cats often pace on treadmills) | Blaszczyk J, Loeb GE (1993) *Why cats pace on the treadmill*, Physiol Behav. https://www.researchgate.net/publication/222467654 : SOURCED-SEC |
| Effect of speed | Speed changes fore-hind (homolateral, diagonal) coupling but **not** left-right homologous anti-phase coupling | Frigon A et al. (2014) J Neurophysiol 111:1885-1902. https://journals.physiology.org/doi/full/10.1152/jn.00524.2013 : SOURCED-ABS |
| Treadmill vs overground (10 cats, 0.5-0.8 m/s) | Treadmill gives longer cycles and stance, shorter swing, more triple/quad support. Overground favours diagonal support and longer steps. Homolateral limbs ~25% more out of phase on the treadmill. | Audet et al. (2026) J Neurophysiol, doi 10.1152/jn.00240.2026, https://journals.physiology.org/doi/full/10.1152/jn.00240.2026 : SOURCED-ABS |
| Fore vs hind timing at the walk | Hind limbs: longer swing, shorter stance than forelimbs. The difference disappears at the trot. | Afelt Z, Kasicki S (1975) *Limb coordinations during locomotion in cats and dogs.* Acta Neurobiol Exp. https://ane.pl/index.php/ane/article/view/266 : SOURCED-ABS |
| Trot limb phase (cat) | not found | not found |

### 5b. Spatiotemporal reference values (overground, pressure walkway)

| Quantity | Forelimb | Hindlimb | Speed | Status / source |
|---|---|---|---|---|
| Stride length | ~0.49 m | ~0.45 m | 0.54-0.74 m/s, 18 cats, 3.1-6.8 kg | *Kinetic and temporospatial parameters in male and female cats walking over a pressure sensing walkway*, BMC Vet Res 2013. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3701551/ : SOURCED-ABS (search summary) |
| Stance time | ~0.45-0.48 s (both pairs, as summarized) | | same | same: SOURCED-ABS |
| Stance time / stride length (31 apparently healthy mature cats) | stance 0.43 s, stride 0.48 m | stance ~0.44 s, swing ~0.30 s | ~0.70 m/s | *Paw pressure and gait in middle-aged client-owned cats...* https://pmc.ncbi.nlm.nih.gov/articles/PMC11654939 : SOURCED-ABS (search summary) |
| Fore:hind stride-length ratio | 1.00 ± 0.04 | | | Stadig SM, Bergh AK (2015) J Feline Med Surg, https://doi.org/10.1177/1098612X14551588 : SOURCED-ABS |
| Fore:hind stance-time ratio | 1.06 ± 0.13 (Stadig & Bergh); 1.07 ± 0.04 (12 cats, Gaitcat walkway) | | | Stadig & Bergh 2015; *Evaluation spatial-temporal and pressure parameters of normal cats at walk*, Springer 2010 chapter, https://link.springer.com/chapter/10.1007/978-3-642-12020-6_15 : SOURCED-ABS |
| Step length on a pressure treadmill | ~25-26 cm | | walking | PMC12753478 / PMC13536722 (search summary): SOURCED-ABS |
| Track width / base of support / step width (cm) | not found (reported in the 2025-2026 Frontiers pressure-treadmill papers, values not visible) | | | not found |
| Duty factor at a given speed | derived example: 0.43 s stance + ~0.30 s swing gives DF ≈ 0.59 (hindlimb, PMC11654939). **Derived arithmetic, not a reported value.** | | ~0.7 m/s | derived |

### 5c. Direct registering (hind paw into fore paw print)

- **No peer-reviewed measurement found.** Only popular and tracking sources (e.g. https://laughingsquid.com/cat-walks-in-own-footprints/) describe felids "direct registering". Indirect support: fore and hind stride lengths are about equal (ratio 1.00 ± 0.04, Stadig & Bergh 2015), which is a necessary condition for hind prints to land on fore prints. It does not prove they do. The amount of overlap, the fore-hind longitudinal offset and the lateral offset: **not found**.

---

## 6. Gaps (searched, not found)

- Scapular rotation amplitude (deg) and vertical/fore-aft translation (mm) for the cat. They are almost certainly in English 1978 (J Morphol) and Boczek-Funcke et al. 1996 (EJN) full texts.
- Shoulder and elbow sagittal angle ranges, and the elbow stance yield, in degrees (Rahmati et al. 2025 Fig. 4; Day & Jayne 2007 tables; Prilutsky lab papers).
- Wrist peak swing flexion (deg).
- Withers vs hip vertical displacement, spine lateral bending, spine pitch, pelvis roll/yaw for normal level walking in cats.
- Head vertical motion relative to trunk bob.
- Tail kinematics during steady walking beyond "largely immobile".
- Cat trot limb phase. Track width (cm).
- The reference-limb convention behind the "homolateral ~0.8" value.

**Next step to close the gaps:** run this from a session with PMC / journals.biologists.com / bioRxiv access, then open and digitize: Rahmati 2025 Fig. 4 (PMC11275737 / bioRxiv 2024.07.11.603106), Bishop 2008 (PMC2583958), Zubair 2016 (PMC4986613) figures, Day & Jayne 2007 tables, and Frigon 2014 tables.

---

## 7. What animators typically get wrong (grounded in the sources above)

1. **Treating the shoulder as a fixed ball joint on the ribcage.** In cats the scapula is the main mover of the forelimb. It swings about a pivot near its **top (dorsal) border**, so the glenoid moves through a crescent path, and in small therians it supplies roughly half or more of step length (Fischer et al. 2002; Boczek-Funcke 1996; Miller & van der Meché 1975). Rig the scapula as its own bone pivoting high on the back, and let the shoulder blades visibly rise and sink.
2. **No scapular "sink" at loading.** The scapula yields downward relative to the trunk after paw contact (Boczek-Funcke 1996). The shoulder blade tops should rise above the spine line during stance, which gives the slinky "prowl" look.
3. **Bending the wrist during stance.** The wrist stays nearly locked (~200 deg, slightly hyperextended), and the roll-over happens at the MCP (240 to 300 deg) (Caliebe 1991). Then the wrist **flicks into flexion just before lift-off**.
4. **Elbow bending the wrong way.** The elbow points backward and flexes in opposition to the knee (Rahmati 2025).
5. **Bobbing the head with the body.** The head is actively stabilized: only ~1.5 cm vertical and ~3 deg pitch, twice per stride, held 10-30 deg nose-down (Zubair 2016). Counter-rotate head pitch against body bob, and keep the gaze angle constant.
6. **Wrong rhythm per channel.** Vertical, fore-aft and pitch run at **2x stride frequency**. Lateral sway, roll and yaw run at **1x** (Zubair 2016; equine/canine references on trunk landmarks).
7. **Trotting diagonal pairs at walking speed.** Cats walk in a **lateral sequence** with even footfall spacing (diagonality ~25%) (Bishop 2008; Day & Jayne 2007). Each forelimb lands roughly a fifth of a cycle after the hindlimb on the same side.
8. **A swishing tail during the walk.** The tail is mostly still in steady walking. Swing it (< 15 deg each side, opposite to body displacement) only for balance corrections (Walker et al. 1998).
