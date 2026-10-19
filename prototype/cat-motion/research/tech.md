# Cat locomotion for a browser game: research survey

Date: 2026-10-19. Target: a low-poly rigged cat (about 20 bones) in Three.js (the project uses `three@0.180.0`). It follows the player along a tile path and must walk, trot, gallop, turn, stop, sit and idle with no foot sliding. Real time, small budget, no server.

**How sure each claim is**
- **[verified]**: I fetched the primary source (a GitHub README or LICENSE, or the paper PDF) and quote it directly.
- **[snippet]**: Many news and vendor sites (techradar, inverse, screenrant, svg.com, gumroad, unrealengine.com, theorangeduck.com, smal.is.tue.mpg.de) were blocked by this session's network proxy. For those, the claim comes from search-engine result text, not the page itself. Read the page before relying on the claim.
- **[uncertain]**: My own inference or estimate. It is not a sourced fact.

---

## 1. Datasets and assets

### Summary table

| Source | What it has | License (exact words where available) | OK for a commercial game? |
|---|---|---|---|
| AI4Animation / MANN dog mocap | 30 min of dog mocap, 27 joints | "CC BY-NC 4.0" | **No** |
| Ubisoft LaFAN1 (used by Holden's Motion-Matching repo) | Human mocap | "CC BY-NC-ND 4.0" | **No**, and it is human only |
| Truebones (free zoo and demo packs) | FBX/BVH animated animals, 75+ in the zoo | "absolutely royalty free ... even commercial"; no redistribution of raw files; credit asked | **Yes** [snippet]. Cat content not confirmed |
| Quaternius animal pack | Low-poly animals (no cat) | "CC0 License" [snippet] | Yes, but there is no cat |
| SMAL / SMAL+ / SMALR body models | Parametric animal body model (includes felids) | SMAL+: "non-commercial research, education, or artistic projects ... Any other use, in particular any use for commercial ... is prohibited" [snippet] | **No** |
| SMALify (fitting code) | Fits SMAL to video | MIT ("As of 02-NOV-2024 ... now MIT licensed") | Code yes, but it depends on SMAL, which is non-commercial |
| BITE (3D dog pose) | Code, D-SMAL model, test set | "available for research purposes" [snippet] | Probably not [uncertain] |
| Animal3D | 3D pose and shape annotations fitted to SMAL | No dataset license found | Unknown; also inherits SMAL, COCO and PartImageNet terms |
| APT-36K | 2D animal keypoints and tracking (video frames) | Repo: "This project is under MIT licence." | Annotations probably yes; the underlying video frames are unclear [uncertain] |
| AP-10K | 2D animal keypoints | Conflicting: CC-BY-4.0 (per the ViTPose++ paper) vs MIT (per the AP-10K datasheet) | Probably yes for annotations [uncertain] |
| Animal Kingdom (CVPR 2022) | Video, 2D keypoints, behaviour labels | No license on the GitHub README; access through a form | Unknown |
| Roboflow "catpose" | 2D cat keypoints | CC BY 4.0 [snippet] | Yes with attribution; 2D only |
| Mixamo | Humanoid only | Free for commercial use [snippet] | Not applicable: no quadrupeds |
| CMU mocap | Human only | (not investigated; human only) | Not applicable |

**Bottom line on data:** I found **no free, commercially usable 3D cat motion-capture dataset.** The only real quadruped mocap with good coverage (the MANN dog data) is non-commercial. Truebones is the one source that is royalty free for commercial use, but I could not confirm whether it includes a cat.

### 1.1 AI4Animation / MANN dog mocap (Zhang, Starke, Komura, Saito, SIGGRAPH 2018) [verified]
- Repo: https://github.com/sebastianstarke/AI4Animation
- README license text, exact: *"This project is only for research or education purposes, and not freely available for commercial use or redistribution. The motion capture data is available only under the terms of the [Attribution-NonCommercial 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/legalcode) (CC BY-NC 4.0) license."*
- Data download: https://starke-consult.de/AI4Animation/SIGGRAPH_2018/MotionCapture.zip
- Contents, from the paper PDF in the repo (`Media/SIGGRAPH_2018/Paper.pdf`): *"30 minutes of unstructured dog motion capture data that is composed of various locomotion modes including walk, pace, trot, and canter, as well as other types of motions such as sitting, standing, idling, lying and jumping. The size of the data is doubled by mirroring. All the motion data was only captured on a flat terrain..."* The skeleton has 27 joints.
- **Verdict:** Fine for internal study, such as measuring gait timing, phase offsets and duty factors to inform hand-tuned parameters. Do not ship the data, or a network trained on it, in a commercial game. Even for a hobby game, NC terms get murky if the game is ever monetized. A dog is also not a cat: the timing is similar, but the posture and spine differ.
- The README also lists a 2026 Python remake (AI4AnimationPy) with a "Quadruped Locomotion Controller — Interactive dog locomotion with gait transitions and action poses". It is presumably under the same research-only terms [uncertain].

### 1.2 Truebones [snippet]
- Terms page (Gumroad, dated 01/01/2019), as quoted in search results: *"TRUEBONES products are absolutely royalty free and can be used for any and all purposes even commercial."* / *"Re-Distribution or ReSale of Truebones in .FBX, .BVH or i-Motion formats is strictly prohibited"* / *"Please provide credit to Truebones when using Truebones."*
- Free packs: "FREE Truebones Zoo, over 75 animated animals with textures in FBX format" (https://truebones.gumroad.com/p/free-truebones-zoo-over-75-animated-animals-with-textures-in-fbx-format) and a free demo (http://truebones.com/freedemo/FreeBones.zip). Some free offers are described as time-limited.
- **Not confirmed:** whether there is a domestic cat (as opposed to big cats or other animals), and whether the zoo animations are mocap or keyframed. Shipping baked animation inside a game build should count as use, not redistribution, but check the actual terms page [uncertain].
- **Verdict:** This is the best candidate for legally usable quadruped clips to retarget onto our cat. Download it and inspect it.

### 1.3 Body-model and 3D reconstruction datasets
- **SMAL** (Zuffi et al.): https://is.mpg.de/code/smal, under the "Perceiving Systems PS:License 1.0". The SMAL+ license (https://awol.is.tue.mpg.de/license.html) per search snippet: *"non-commercial research, education, or artistic projects. Any other use, in particular any use for commercial, is prohibited"* and *"This license prohibits the use of the Model to train methods/algorithms/neural networks/etc. for commercial use."* SMALR uses the same PS:License 1.0. Treat the whole SMAL family as **non-commercial**.
- **SMALify** [verified]: https://github.com/benjiebob/SMALify. *"As of 02-NOV-2024, this dataset is now MIT licensed."* It fits SMAL pose, shape and camera to 2D keypoints and silhouettes from monocular images or video. It needs PyTorch and PyTorch3D, ideally with CUDA. The code is MIT, but it outputs SMAL parameters, so the model license applies.
- **BITE** (Rüegg et al., CVPR 2023, dogs, ground-contact aware): https://bite.is.tue.mpg.de/. *"code, model, and test dataset are available for research purposes"* [snippet].
- **Animal3D** (ICCV 2023): https://arxiv.org/abs/2308.11737. No dataset license found. It uses SMAL fits on COCO and PartImageNet images.
- **Animal Avatars** (Sabathier, Mitra, Novotny, ECCV 2024, dogs from monocular video): https://arxiv.org/abs/2403.17103. No code or license confirmed. **4D-Animal** (2025): https://github.com/zhongshsh/4D-Animal (license not checked).
- **APT-36K** [verified]: https://github.com/pandorgan/APT-36K. *"This project is under MIT licence."* 2D only.
- **AP-10K**: https://github.com/AlexTheBad/AP10K. The license is conflicting (CC-BY-4.0 vs MIT). 2D only.
- **Animal Kingdom** [verified that no license is shown]: https://github.com/sutdcv/Animal-Kingdom. The README has no license; the data is behind a download form.
- **Animal-Pose, Roboflow catpose**: 2D cat keypoints only. They are useful for training a detector, not for animation.

### 1.4 Tools to extract motion from video

| Tool | License | 3D? | Feasibility for us |
|---|---|---|---|
| DeepLabCut, https://github.com/DeepLabCut/DeepLabCut [verified] | *"primarily licensed under the GNU Lesser General Public License v3.0"*; *"SuperAnimal models are provided for research use only (non-commercial use)."* | Yes, multi-camera triangulation | You would label your own frames (no SuperAnimal), film a cat with 2+ synced cameras, triangulate, then retarget. That is days to weeks of work. |
| SLEAP, https://github.com/talmolab/sleap [verified] | *"SLEAP is released under a BSD 3-Clause Clear License."* | Not stated on the README | Same 2D-labelling workflow; 3D needs separate triangulation. |
| ViTPose / ViTPose++, https://github.com/ViTAE-Transformer/ViTPose | Apache-2.0 (per a metadata aggregator) | 2D | Off-the-shelf animal 2D keypoints. Check the license of the weights' training data. |
| SMALify / BITE / Animal Avatars | See above | Monocular 3D | Research-grade, dog-focused, SMAL non-commercial. |
| MoCapAnything (arXiv 2512.10881) | Not checked | Monocular 3D, arbitrary skeletons; tested on cat videos | Research only. Its paper notes animal mocap "usually builds on SMAL". |

**Verdict:** Extracting cat motion from video is possible but costly. Getting clean, foot-locked 3D cycles needs multi-view footage, labelling, triangulation and cleanup, and the result still needs hand polish. For a ~20-bone stylized cat, **hand-keying from video reference (what Stray did, see section 3) is cheaper and gives better control.** The video tools are most useful for **measuring timing** (stride frequency, phase offsets, duty factor) from your own footage of a cat.

---

## 2. Techniques

### 2.1 Hand-keyed cycles plus procedural layer (semi-procedural) — recommended core
- **Rune Skovbo Johansen, "Automated Semi-Procedural Animation for Character Locomotion"**, MSc thesis, Aarhus 2009: https://runevision.com/thesis/ and the Unity Locomotion System at https://runevision.com/tech/locomotion/. It analyzes example walk and run cycles at design time, blends them at runtime by speed, and uses IK so the feet land correctly. Per its abstract it works "for both human and non-human characters with any amount of legs" [snippet]. This is the closest published blueprint for what we need.
- **David Rosen (Wolfire), GDC 2014 "An Indie Approach to Procedural Animation"**: https://www.gdcvault.com/play/1020583/ (free on the Vault, per snippet). Procedural interpolation between a handful of key poses, driven by physics and springs, in Overgrowth. A forum claim says the system used only about 13 keyframes [snippet, unverified].
- **Gwen Frey, GDC 2016 "Animating Quadruped Characters in The Flame in The Flood"**: https://gdcvault.com/play/1023209/. Quadruped locomotion without transition animations, comparing a rigid-spine boar with a wolf that has a "procedural spine" [snippet, from the session description].
- **Spore** (Hecker et al., SIGGRAPH 2008): https://chrishecker.com/Real-time_Motion_Retargeting_to_Highly_Varied_User-Created_Morphologies. Keyframed motion is stored in a morphology-independent form and solved through IK at runtime. This is overkill for one fixed cat, but its idea of authoring foot-plant semantics and letting IK resolve them is the relevant part.
- **Realism:** High, because the style comes from hand-keyed cycles and the feet are locked by IK. **Cost:** Low runtime cost (a few two-bone IK solves per frame). Moderate authoring: about 3–4 cycles plus sit, idle and turn clips. **Fit:** Excellent for a 20-bone cat in Three.js.

### 2.2 Fully procedural footstep planning and IK
- Typical recipe (Rain World, spider and creature demos): the body moves on a path. Each foot has a rest target relative to the body and steps when it drifts past a threshold, following a gait phase schedule. Feet swing on an arc, and IK solves each leg.
  - Rain World's creatures are "a bunch of points in space connected at set distances" with a drawn "paper doll" on top [snippet; Jakobsson quoted via https://unity.com/en/blog/exploring-procedural-design-rain-world and related coverage]. That is 2D, but the same idea of a physical body with procedural limbs applies.
- **Realism:** It never slides, because feet are planted by construction, and it adapts to any speed and turn radius. It tends to look robotic unless you add spine flex, head stabilization, shoulder-blade and hip roll, tail follow-through, and gait-specific timing.
- **Cost:** Cheap at runtime. Most of the tuning effort goes into "feel".
- **Fit:** Good, especially for turns, start/stop and tile-path following. It is weakest for sit and idle, which should be keyed.

### 2.3 Phase-functioned / mode-adaptive neural networks (PFNN, MANN)
- **MANN** [verified from paper]: a gating network blends expert weights into a motion-prediction network. Hidden layers have 512 units (*"h is the number of units used in the hidden layers, which in our work is set to 512"*), and the gating network has 32 hidden units. Runtime: *"∼2 ms per frame for running the neural network single-threaded on an Intel Core i-7 CPU using a port of the Eigen library. The memory usage for the trained model is ∼22 MB using 8 expert weights."* Training took about 20–30 h on a GTX 970. Limitation: flat terrain only.
- **In a browser:** About 22 MB of float32 weights (roughly 5.5M parameters) downloaded once. Blending 8 experts each frame is about 5.5M multiply-adds, plus about 0.7M for the forward pass. That is plausibly 1–5 ms per frame in WASM-SIMD or hand-written JS, and could be quantized to fp16 or int8 [uncertain: my estimate, not measured]. ONNX Runtime's docs recommend the WASM backend for very small models and WebGPU for larger ones (https://onnxruntime.ai/docs/tutorials/web/performance-diagnosis.html).
- **Blockers:**
  1. **Data:** the only quadruped training set (the dog data) is CC BY-NC.
  2. It needs a skeleton matching the training data (27 joints) plus retargeting onto our rig.
  3. It needs a Python training pipeline and roughly a day of GPU time.
  4. The output still slides somewhat, and the paper reports measured foot-skating. Foot IK cleanup is needed anyway.
- **Verdict:** Technically feasible in a browser but **not recommended**. There is no legal cat or quadruped data, it is a big pipeline, and for one cat it is not better than hand-keyed cycles plus IK.

### 2.4 Motion matching / learned motion matching
- **Motion matching** (Simon Clavet, Ubisoft, GDC 2016 "Motion Matching and The Road to Next-Gen Animation", https://gdcvault.com/play/1022985/): search a mocap database each few frames for the clip frame that best matches the current pose and desired future trajectory, then blend in [snippet]. The Motion Matching for Unity FAQ says quadrupeds work with suitable data, and that features usually need "only the feet and one central joint (hips)" [snippet].
- **Learned Motion Matching** (Holden, Kanoun, Perepichka, Popa, SIGGRAPH 2020): https://www.theorangeduck.com/media/uploads/other_stuff/Learned_Motion_Matching.pdf and https://www.ubisoft.com/en-us/studio/laforge/news/3NWqwcMU9lMfumgfPAEfka/learned-motion-matching. It replaces the database with networks (decompressor, stepper, projector) to cut memory.
- **Reference code** [verified]: https://github.com/orangeduck/Motion-Matching (code MIT; its data is LaFAN1, *"Creative Commons Attribution-NonCommercial-NoDerivatives 4.0"*, human only).
- **Verdict:** Motion matching shines with **lots of unstructured mocap** (hours of it). We have none for cats. With about 10 hand-keyed clips, a parametric blend tree plus IK gives the same result more simply. LMM solves a memory problem we do not have.
- **Worth borrowing:**
  - **Inertialization:** blend by decaying the pose offset at a transition instead of cross-fading two poses.
  - **Spring-damped trajectory prediction:** for following the tile path smoothly.
  - Holden's argument for **code-driven root displacement with animation adjusted to match**, rather than root motion. The orangeduck site was not reachable, so this is from memory of the repo's associated article "Code vs Data Driven Displacement" [uncertain on details].

### 2.5 Physics-based / reinforcement-learning imitation (DeepMimic family)
- Peng et al., "Learning Agile Robotic Locomotion Skills by Imitating Animals" (RSS 2020, https://arxiv.org/abs/2004.00784): reinforcement learning policies imitate dog mocap clips in simulation, then transfer to a quadruped robot.
- **Verdict:** Not a fit. It needs reference mocap anyway, physics simulation in the browser, hours of reinforcement-learning training, and is fragile. Its realism gain (physical plausibility under pushes) is irrelevant for a cat trotting along tiles.

### 2.6 Cat gait facts to encode (for 2.1 and 2.2)
- Hildebrand's framework describes symmetrical gaits by **duty factor** (the fraction of the stride a foot is on the ground) and **diagonality** (the fore/hind phase lag). Lateral-sequence gaits have D < 50, diagonal-sequence gaits D > 50. See the Cartmill et al. 2002 support-polygons paper: https://www.originalwisdom.com/wp-content/uploads/bsk-pdf-manager/2019/10/Cartmill-et-al_2002_Support-polygons-and-symmetrical-gaits-in-mammals.pdf
- RVC summary: medium-to-large mammals, including big cats, use "a lateral sequence, with a phase of about 25%" at slow speeds [snippet]. https://www.rvc.ac.uk/research/research-centres-and-facilities/structure-and-motion/news/walk-this-way-2
- I did not find domestic-cat-specific numbers. A practical starting point [uncertain, typical textbook values, measure from video]:
  - **Walk:** lateral sequence LH → LF → RH → RF, about 25% phase offsets, duty factor about 0.6–0.7.
  - **Trot:** diagonal pairs in sync, duty factor about 0.4–0.5.
  - **Gallop (rotary/transverse):** duty factor below 0.4, with spine flexion and extension as the main driver.
- Cats also tend to place the hind paw near where the fore paw was ("direct register"). That gives clean footprints and is easy to fake with IK targets [uncertain; commonly stated, not sourced here].

### 2.7 Three.js specifics
- `three/addons/animation/CCDIKSolver.js` exists [verified in the three.js repo]. It is a general CCD IK solver for SkinnedMesh.
- For legs, an **analytic two-bone (or three-bone, for the cat's digitigrade hind leg) solver** is cheaper and more stable than CCD. Lock the pastern/metatarsal angle as a function of the femur angle, the way game quadruped rigs usually do [uncertain: standard practice, not sourced here].
- `AnimationMixer` handles clip playback and cross-fading. Add speed-synced blending (scale clip `timeScale` so the stride matches ground speed) plus an IK pass after `mixer.update()` and before render.

---

## 3. Stray (BlueTwelve Studio, 2022)

**Findings** (all from interview coverage; most pages could not be fetched directly, so all are [snippet] except where noted):
- **No motion capture.** Producer Swann Martin-Raget: *"no motion capture technology was used in the process of making Stray"*, as reported by TechRadar (https://www.techradar.com/features/stray-exclusive-how-the-devs-made-the-most-relatable-cat-game-of-all-time).
  - Inverse interview (https://www.inverse.com/gaming/stray-cat-game-robots-interview): the team knew of cat-mocap services but were "quite happy with the freedom" of hand animation, and some scenes would be "very difficult and dangerous to ask a real cat to do". The text was verified only through a syndicated copy.
- **Hand-keyed by essentially one animator.** In the same Inverse interview, Martin-Raget said "Miko is the person that made the vast majority of cat animation in the game", and that the team is "really fluent and talented with keyframe animation". Rock Paper Shotgun reportedly quoted "everything was animated by hand" (I could not access the original). GamesRadar calls Miko a sole animator; SVG says he headed a team, so the team size is unclear.
- **Reference:** Studio cats were the reference. The office cat Oscar was filmed for jumps and runs, and Miko's Sphynx was another reference (Game Rant, SVG, Wireframe coverage). Miko was said to be "the most knowledgeable person around when it came to YouTube cat videos". "Nailing down the basic movements took months" (Wireframe/Raspberry Pi article: https://wireframe.raspberrypi.com/articles/exploring-un-fur-miliar-territory-in-stray).
- A **cat programmer** worked with the lead animator on the basic movements (TechRadar, via snippet).
- **Engine:** Unreal Engine 4 (https://en.wikipedia.org/wiki/Stray_(video_game)).
- **Design choice that hides animation problems:** jumps are **button-prompted, not free-form**. An X prompt appears when a jump target is valid (Digital Trends and GamesRadar via snippet). Every jump is therefore a known start-to-target pair, which can play an authored clip without improvised airborne poses.
- **Not found:** any talk or interview describing procedural IK, foot placement, motion matching or blend-tree details in Stray. Shipped UE4 games normally layer foot IK on keyed clips, but **I have no source that Stray did** [uncertain]. The Unreal developer interview "28 people and two cats" (https://www.unrealengine.com/developer-interviews/28-people-and-two-cats-inside-the-making-of-stray) could not be fetched and may have more.

**What a top studio would do for one hero cat** (an inference from Stray plus standard practice):
1. A hand-keyed library made by a skilled animator from video reference.
2. Constrain gameplay so the library covers every case (Stray's prompted jumps; for us, tile-to-tile movement).
3. A runtime layer: speed-matched blending, foot IK and look-at.

---

## 4. Ranked recommendation

**1. Hand-keyed cycles plus a procedural layer (best fit).**
- **Author a small clip set** on our rig: walk, trot, gallop (each one loop, with foot-contact markers per paw), idle (plus 1–2 fidget variants), sit-down, sit-idle, stand-up, and optionally turn-in-place left/right.
  - Use video of real cats as reference (Stray's method).
  - Optionally inspect Truebones zoo clips (commercially usable, credit required) for timing or a retarget base, if a suitable cat or similar quadruped exists.
  - Use the MANN dog data and paper only to **study** gait timing; do not ship them.
- **Locomotion controller:**
  - Ground speed comes from the tile path (a spring-damped follower).
  - Choose the gait by speed thresholds with hysteresis. Blend neighbouring gaits with a shared normalized phase so footfalls stay synced.
  - Set each clip's `timeScale` so stride length × frequency equals ground speed.
- **Foot locking:**
  - From the contact markers, pin each planted paw at its world position. Run an analytic leg IK (2-bone plus a constrained third segment) after the mixer.
  - Release the pin at lift-off and blend the swing paw toward the clip's swing pose re-targeted to the predicted landing spot.
  - This is the Johansen / Unity Locomotion System pattern, and it removes sliding.
- **Procedural polish:**
  - Body lean into turns. Pelvis and shoulder height follow the planted paws.
  - The spine bends along the path curvature, which is important for a cat on tile corners.
  - Head stabilization and look-at toward the player.
  - Spring-driven tail (a 3–5 bone chain).
  - Inertialization or short cross-fades for gait, stop and sit transitions.
- **Stopping:** decelerate to a planted pose. Pick the stop clip or freeze point by the current phase so the last paw lands, then cross-fade into idle or sit.
- **Cost:** About 1–3 weeks for a dev plus animator [uncertain], and well under 1 ms per frame at runtime [uncertain]. It is also the only option with no legal exposure.

**2. Fully procedural gait (2.2) as a fallback or complement.** Use it if no animator is available. Phase-scheduled footsteps along the path plus IK, spine and tail springs, with keyed poses only for sit and idle. It never slides and handles any path, but needs heavy tuning to read as feline. A good hybrid is option 1's clips for the upper body and spine, with option 2's stepping for the legs.

**3. Motion matching.** Only worth it if we later get hours of usable cat data. Borrow its trajectory prediction and inertialization ideas now.

**4. MANN/PFNN in the browser.** Feasible (about 22 MB, a few ms per frame), but blocked by the non-commercial data license and pipeline cost.

**5. Physics/RL imitation.** Not appropriate for this project.

### Open items to verify
- Download the Truebones free zoo. Check for a domestic cat and read the current terms page directly (gumroad was unreachable from here).
- Read the Unreal "28 people and two cats" interview and the Inverse, TechRadar and Wireframe pieces in a normal browser for any Stray IK details.
- Measure cat walk, trot and gallop timing from your own video (duty factor, phase offsets, stride length vs speed) to replace the placeholder values in 2.6.
