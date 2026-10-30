// Grows the pets' skins off the main thread: each look takes seconds of marching and painting, which used to
// run on the page while the start screen was up and froze the intro's ASCII swirl. The page posts a look's
// name; the worker grows it (feline-skin.js, the same code the page would run) and sends the hull back.
import {growFelineHull, grownFelineHull} from './feline-skin.js';
import {packHull} from './hull-transfer.js';

self.onmessage = ({data: {name, colour}}) => {
  try {
    growFelineHull(name, colour);
    const grown = grownFelineHull(name, colour);
    if (!grown) throw new Error('no hull grown');
    const {data, transfer} = packHull(grown.hull);
    self.postMessage({name, colour, key: grown.key, hull: data}, transfer);
  } catch (e) { self.postMessage({name, colour, error: String(e?.message || e)}); }
};
