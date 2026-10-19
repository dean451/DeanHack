# Resting and grooming behaviours: timing

Numbers for the pet cat's sleep, stretch, yawn, grooming, scratching and eating. Each is tagged
*sourced* (with where it comes from) or *estimate* (with what it is estimated from).

| Behaviour | Value | Tag | Source |
| --- | --- | --- | --- |
| Yawn | about 2.0 s (mean 1.97 s for domestic cats) | sourced | Gallup et al. 2016, Biology Letters: 205 yawns from 177 individuals of 24 taxa; brain size predicts yawn length |
| Grooming time | 25–30% of the time awake | sourced | grooming reviews cited by Noel & Hu 2018 (PNAS) |
| Grooming lick | about 1 lick per second | estimate | the rate Noel & Hu 2018 (PNAS) assume for their tongue model; not a measurement |
| Lapping (drinking) | 3.5–4 laps per second (4.0 ± 0.2 on water) | sourced | Reis, Jung, Aristoff & Stocker 2010, Science |
| Hind-leg ear scratch | about 6 strokes per second | estimate | between the paw-shake reflex (about 10 Hz, simulation studies) and fictive scratching cycle periods in the decerebrate cat; not a direct measurement |
| Chewing | about 2.5 cycles per second | estimate | chewing rate scales with body mass to about the -0.13 power (allometric analyses), applied to a 4 kg cat; cats chew on one side at a time and shift the food with sideways jerks of the head (Gorniak & Gans 1980) |
| Sleep breathing | about 20–30 breaths per minute | estimate | the resting rate vets give for cats (20–30); slower asleep |
| Time budget | about 37% lying, 37% sitting, 13% standing | sourced | pet-cat time budgets (see postures.md) |

What these do in the game (feline-skin.js): the yawn's clip lasts the measured length; grooming
licks run near one a second; the scratch and the chewing use the estimates above until measured
from video.
