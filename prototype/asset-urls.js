// Rigged creature models dropped into prototype/models/ as <monster-name>.glb, keyed by
// file name. Vite bundles only the files that exist and reloads when one is added.
export const MODEL_URLS=Object.fromEntries(Object.entries(
 import.meta.glob('./models/*.glb',{query:'?url',import:'default',eager:true})
).map(([path,url])=>[path.split('/').pop().toLowerCase(),url]));
