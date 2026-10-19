# Cat motion reference

This is the target spec for the cat (and other felines) in the 3D view. Motion code is checked against these numbers in tests, not by eye. `cat-measure.js` takes the measurements, and `tools/cat-lab.html` shows them against this spec: footfalls, joint angles, paw and head heights, and the sit. The cited source notes are in `research/`. Every number there is tagged as sourced (with paper, table or figure), estimated or not found.

**How reliable it is.** These notes were collected in a session that could only read search-result text: abstracts, table fragments and quoted sentences. No full paper and no figure was opened. The numbers below are the ones the notes give with a source. Rows marked *estimate* or *open* need either the full papers or our own measurements from side-on video of a real cat.

Reference cat: an adult domestic cat of about 4 kg. Head-and-body length about 0.48 m, standing hip height about 0.23 m. Scale to the game cat by body length (BL) or hip height.

## 1. Gaits and speeds

| Gait | Speed (m/s) | Speed (BL/s) | Notes | Source |
| --- | --- | --- | --- | --- |
| Calm walk | 0.6–0.7 preferred (0.4–1.0 range) | ~1.3–1.4 | Lateral-sequence walk: RH → RF → LH → LF | Verdugo 2013; Stadig & Bergh 2015; Bishop 2008 |
| Walk → trot | ~1.0 | ~2.1 | Froude ~0.5 | Bishop, Pai & Schmitt 2008 |
| Trot | 1.2–2.0 | ~2.5–4.2 | Duty factor ≤ 0.5 | gaits.md |
| Trot → gallop | ~2.1 (estimate) | ~4.4 | From the mass equation; trot and gallop both seen at 2.25 m/s | Heglund & Taylor 1988; Smith 1993 |
| Gallop / half-bound | 2–6 | ~5–12 | Rotary or transverse gallop, or half-bound; one flight phase per stride | Norgren 1977; Kim 2014 |
| Stalking crouch | – | – | Hip height −30%, back level; timing unchanged (766 ms cycle, 70% stance at 0.5–0.6 m/s) | Trank 1996 |

Pacing is a treadmill artefact. Don't use it.

## 2. Walk timing (about 0.6–0.7 m/s)

| Quantity | Value | Source |
| --- | --- | --- |
| Stride length | 0.44–0.49 m (≈ 0.95 BL) | Verdugo 2013 |
| Stride time | 0.70–0.84 s (≈ 1.2–1.4 Hz) | Verdugo 2013; Yakovenko 2002 |
| Stance | 0.43–0.48 s | Verdugo 2013 |
| Swing | 0.20–0.30 s, nearly constant with speed | Halbertsma 1983; Goslow 1973 |
| Duty factor (each foot) | 0.55–0.70; felid mean 0.64 | Verdugo 2013; Audet 2026; Day & Jayne 2007 |
| Fore vs hind stride length | 1.00 ± 0.04 | forelimb-trunk.md §5b |
| Diagonality | ≈ 25% (fore foot lands ~¼ cycle after the hind foot on the same side) | Bishop 2008; Day & Jayne 2007 |
| Hind paw placement | Lands in or near the fore paw print (direct registering). Only tracking guides back this; no measured study. | *open* |

**Speed rule.** As speed rises, stance shortens a lot and swing barely changes. Of the stance phases, push-off (E3) shortens most. Joint angles stay about the same across speeds (Goslow 1973; Halbertsma 1983; Wisleder 1990). Speed changes the timing and the stride length, not the pose.

## 3. Hind leg (interior angles, degrees; 0% = paw contact)

| Joint | Paw contact | Paw off (~62%) | Peak flexion in swing |
| --- | --- | --- | --- |
| Hip | ~92 | ~135 | 91 ± 8 (late swing) |
| Knee | ~115 | ~118–121 | 98 ± 9 (~80%) |
| Ankle | ~115 | ~139 | 102 ± 9 (~80%) |
| MTP (toe) | ~154 | extends to its maximum, then flexes fast ~50 ms before lift-off | – |

Sources: Lecomte 2021 Table 1; Gregor 2006 Table 2; Smith 1998; Kuhtz-Buschbeck 1994. hindlimb.md §1c has a 10-point *constructed* curve between these anchors for a first rig pass. It must be replaced by measured curves.

**Phase rules (Goslow 1973, Philippson phases):**
- **E2, landing yield (contact → mid-stance):** the knee and ankle *flex* under load while the hip *extends*. The yield depth is *open*; it is likely modest (5–10°).
- **E3, push-off (mid-stance → paw off):** hip, knee and ankle all extend together. The ankle reaches its maximum extension.
- **F, early swing:** all three flex together.
- **E1, late swing:** the knee and ankle extend to reach for the ground while the hip keeps flexing.
- **Toes:** they bend upward through stance, then snap down just before lift-off.
- **Swing paw path:** it stays low; obstacle steps add only 0.9–1.5 cm. The paw drifts 2–3 cm sideways during swing. Peak toe height is *open*.

## 4. Front leg, shoulder blade and trunk

- **Shoulder blade:**
  - With no bony collarbone, the scapula swings once per stride about a pivot near its top edge.
  - It also slides, lifts and sinks against the chest wall when the paw takes weight.
  - In small mammals it supplies 43–73% of forelimb step length; the cat value is *open*.
  - The shoulder joint traces a crescent path that keeps its shape across speeds.

  (Boczek-Funcke 1996; English 1978; Fischer & Blickhan 2006)
- **Shoulder joint:** flexes and extends twice per stride.
- **Wrist:**
  - Through stance it stays nearly straight, slightly over-extended (~200° on the 0–360 scale).
  - The knuckle joint rolls from ~240° to ~300°.
  - Just before lift-off, the wrist and knuckle flex quickly.

  (Caliebe 1991)
- **Shoulder and elbow ranges, withers vs hip bob, spine bend:** *open*.

## 5. Head and tail

- **Head:**
  - Carried 10–30° nose-down and actively stabilised.
  - Twice per stride: about 1.5 cm vertical travel peak to peak and ~3° pitch.
  - Once per stride: about 1 cm sideways and 1.5–3° roll.

  (Zubair 2016)
- **Tail:** almost still in steady walking. It counter-swings only to balance, usually under 15° each side (Walker 1998). It doesn't swish while walking.

## 6. Sit and rest

- **Sit (ethograms; Stanton 2015, Ellis & Wells, Kappel):**
  - The **rump** is on the floor, the hind legs are folded on the ground and the forelegs are straight and vertical.
  - The hip joint is well above the floor: the folded thigh and shin bones (~11 cm each) and the thigh muscles hold it up.
  - Measured sit angles and hip height are *open*. We will measure them from video.
- **Joint limits (20 cats):** hip folds to ~33°, knee to ~24°; both straighten to ~164°. Ankle 21–167° comes from a single case report.
- **Sit to stand:** greyhounds only (no cat data). It takes 1.14 ± 0.16 s; the hip straightens first, then the knee, then the ankle.
- **Jump push-off:** ~150 ms (Zajac 1981).
- **Time budget (pet cats):** ~37% lying, 37% sitting, 13% standing.
- **Blink rate:** 1–5 per minute (low quality).

## 7. Proportions

- **Hind leg segments:** femur 34.7%, tibia 32.4%, metatarsals 22.1% of hind leg length (Day & Jayne 2007); femur ~114 mm, tibia ~112 mm (CT).
- **Front leg segments:** scapula 7.1, humerus 10.0, radius 9.2, carpals plus metacarpals 3.3 cm (Rahmati 2025, preprint).

## 8. What this means for our cat

Mismatches in the current procedural walk, `feline-skin.js`:

| Ours | Real | Effect |
| --- | --- | --- |
| Walk at 2.1 strides/s | ~1.25 strides/s | Legs churn |
| Sine legs, 50% on the ground | 55–70% on the ground; slow stance, fast swing | Floaty, mechanical |
| All joints on one phase | Hip runs opposite to knee and ankle in E1 and E2 | No reach, no push |
| No landing yield or toe roll | Knee and ankle give on landing; toes bend up, then flick | Stiff, weightless |
| Whole clip sped up with speed | Stance shortens, swing stays ~0.25 s | Frantic at speed |
| Head bobs with the body | Head stabilised, ~1.5 cm and ~3° | Toy-like |
| Fixed shoulder | Scapula swings and slides | Front end looks rigid |
| Sit drops the hip joint to the floor | Rump on the floor, hip held up by folded thigh | Body tilts down like a ramp |
| Pet slides tile to tile | Trailing pet walks a smoothed path; trots to catch up | Gallop-darting |

## 9. Approach

This is the ranked recommendation from research/tech.md. There is no free cat mocap that a commercial game can use: AI4Animation and SMAL are non-commercial. *Stray*'s cat was keyed by hand from video reference, with no mocap.

1. Gait cycles built from these measurements, each with marked paw-contact events.
2. Gaits blended on a shared phase. Stride matched to ground speed, with stance shortening and swing held.
3. Planted paws pinned with analytic leg IK. A footstep planner places the paws along the path.
4. A trailing path follower: walk when 0–2 tiles behind, trot further back, gallop only on long chases.
5. Secondary motion:
   - stabilised head and look-at
   - spine bend along the path
   - near-still tail on a spring
   - transitions that blend out the pose difference instead of cross-fading whole clips
6. Sit, lie and stand transitions taken from video measurements.

## 10. Still to fill (by video or full papers)

- Full angle-over-time curves for walk and trot (Goslow 1973; Smith 1998 Table 2; Gregor 2006).
- Landing yield depth, peak paw height, shoulder and elbow ranges, scapula rotation.
- Withers vs hip vertical travel, spine bend.
- Sit angles and hip height.
- Timing of the sit, lie and stand transitions.
- Pre-pounce crouch.
