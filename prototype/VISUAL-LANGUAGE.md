# Visual language

One colour and one motion per element, so the same thing looks the same on a wand, a ring, a breath or a trap. The palette lives in `visual-language.js` (`ELEMENTS`, `elementColor`, `elementMotion`); new effects should read from it instead of picking their own hex. The world is dark, so these are strong, slightly dangerous colours, never pastel.

| Element | Colour | Motion | Look |
| --- | --- | --- | --- |
| `fire` | #ff7a26 | rise | orange embers climbing, heat shimmer |
| `cold` | #bfe6ff | fall | pale blue frost and mist sinking |
| `poison` | #7fb23a | drift | sickly green wisps, slow and wet |
| `shock` | #cfe2ff | crackle | white-blue arcs, brief and jagged |
| `holy` | #fff1c4 | rise | white-gold light lifting steadily |
| `curse` | #5a2a7a | smoke | dark violet smoke that swallows light |
| `missile` | #8fb4ff | orbit | violet-blue darts circling |
| `blood` | #8a1c1c | fall | dark red drips and slow clotting |
| `acid` | #9acd32 | sparkle | corrosive green fizz |
| `sleep` | #3a4a9a | drift | dim dark-blue motes, drowsy |
| `death` | #5fae7a | pulse | cold sickly green, silent and dimming |
| `arcane` | #c56bff | orbit | purple blinks and swirls: teleport, polymorph |
| `earth` | #8a6a45 | fall | grit and rock dust |

Rules: add a new element to the table and to `ELEMENTS` together (a test checks both); keep colours visibly apart, or give close ones (cold and shock) different motions; effects add emissive glow and small particles, never extra lights; no sound.
