import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,renameSync,mkdirSync,realpathSync,readdirSync,statSync,unlinkSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,sep,dirname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {resolveChoice} from '../roles.js';

export function encodeReply(request, body) {
  if(!request || body.id!==request.id) throw new Error('Stale input; wait for the next engine prompt.');
  if(request.kind==='line') {
    if(typeof body.value!=='string'||body.value.length>200||/[\r\n\0]/.test(body.value))throw new Error('Invalid line');
    return body.value+'\n';
  }
  if(request.kind==='menu') {
    if(typeof body.value!=='string'||!/^(!|\d+(,\d+)*|)$/.test(body.value)||body.value.length>200)throw new Error('Invalid selection');
    return body.value+'\n';
  }
  if(!Number.isInteger(body.value)||body.value<1||body.value>255)throw new Error('Invalid key');
  return body.value+'\n';
}
export const DEFAULT_PLAYER_NAME = 'Adventurer';
// The character's name, typed by the player. It goes to the engine as `-u` and in NETHACKOPTIONS
// (comma separated), and it names the save file, so keep it short and plain: letters, digits,
// spaces, underscores and apostrophes, starting with a letter or digit so it can never read as a
// command-line option. No hyphens: NetHack reads "name-role-race-gender-alignment" suffixes, so
// "Mary-Jane" would become the name "Mary" with a bad role. Anything else, or nothing, is the default.
export function cleanPlayerName(raw) {
  if (typeof raw !== 'string') return DEFAULT_PLAYER_NAME;
  const name = raw.replace(/[^A-Za-z0-9 _']/g, '').replace(/\s+/g, ' ').trim().slice(0, 24).trim();
  return /^[A-Za-z0-9]/.test(name) ? name : DEFAULT_PLAYER_NAME;
}
// The characters saved on this server, newest first. NetHack names a save file <uid><name>.bz2, so
// the owner's uid is the prefix to strip; level snapshots (<uid><name>.0) and anything whose name
// the launcher would not accept are ignored.
export function listSaves(dir, uid) {
  let files;
  try { files = readdirSync(dir); } catch { return []; }
  const prefix = String(uid), saves = [];
  for (const file of files) {
    if (!file.startsWith(prefix) || !file.endsWith('.bz2')) continue;
    const name = file.slice(prefix.length, -4);
    if (!/^[A-Za-z0-9][A-Za-z0-9_']{0,23}$/.test(name)) continue;
    try { saves.push({ name, savedAt: Math.round(statSync(resolve(dir, file)).mtimeMs) }); } catch {}
  }
  return saves.sort((a, b) => b.savedAt - a.savedAt);
}
// The finished games on this server, from the engine's xlogfile: one game per line, key=value
// fields separated by tabs (older builds used colons; the engine turns the separator and newlines
// inside a name or a death into underscores, so a split is safe). Only what the leaderboard shows
// goes out: the character's name, never the uid or a login. Wizard and explore mode games do not
// count. Highest score first, at most `limit` entries.
export function parseXlogfile(text, limit = 25) {
  const scores = [];
  for (const line of String(text ?? '').split('\n')) {
    if (!line.trim()) continue;
    const fields = {};
    for (const part of line.split(line.includes('\t') ? '\t' : ':')) { const i = part.indexOf('='); if (i > 0) fields[part.slice(0, i)] = part.slice(i + 1); }
    const points = Number(fields.points), name = (fields.name || '').trim();
    if (!name || !Number.isFinite(points) || points < 0) continue;
    if (fields.mode === 'debug' || fields.mode === 'explore') continue;
    const num = v => { const n = Number(v); return v !== undefined && v !== '' && Number.isFinite(n) ? n : null; };
    const date = /^\d{8}$/.test(fields.deathdate || '') ? `${fields.deathdate.slice(0, 4)}-${fields.deathdate.slice(4, 6)}-${fields.deathdate.slice(6)}` : null;
    scores.push({ name: name.slice(0, 32), points, death: (fields.death || '').slice(0, 200), deathlev: num(fields.deathlev), maxlvl: num(fields.maxlvl), turns: num(fields.turns), role: fields.role || null, race: fields.race || null, when: date });
  }
  // a stable sort keeps the order of equal scores as played
  return scores.sort((a, b) => b.points - a.points).slice(0, limit);
}
export function readScores(file, limit = 25) {
  let text; try { text = readFileSync(file, 'utf8'); } catch { return []; }
  return parseXlogfile(text, limit);
}
// Which class each character was started as, so the saved-characters list can say "Wizard" without
// loading the save. Keyed "<player number>:<save name>" in <var>/characters.json.
export function readCharacters(file) {
  try { const data = JSON.parse(readFileSync(file, 'utf8')); return data && typeof data === 'object' ? data : {}; } catch { return {}; }
}
export function rememberCharacter(file, key, choice) {
  const all = readCharacters(file);
  all[key] = { role: choice.role, race: choice.race, gender: choice.gender, align: choice.align };
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file + '.tmp', JSON.stringify(all));
  renameSync(file + '.tmp', file);
}
// A save file name has no spaces: "Mary Jane" is saved as "Mary_Jane".
export const saveKey = name => cleanPlayerName(name).replace(/ /g, '_');

// Delete a character: its save (compressed or not), its level files and its class note. Returns
// how many files went. Only this player's number, only this name, only inside the var folder.
export function forgetCharacter(dir, uid, key) {
  const stem = `${uid}${key}`, tryUnlink = f => { try { unlinkSync(f); return 1; } catch { return 0; } };
  let n = tryUnlink(resolve(dir, 'saves', stem + '.bz2')) + tryUnlink(resolve(dir, 'saves', stem));
  let levels = [];
  try { levels = readdirSync(resolve(dir, 'level')); } catch {}
  const mine = new RegExp('^' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.\\d+$');
  for (const f of levels) if (mine.test(f)) n += tryUnlink(resolve(dir, 'level', f));
  const file = resolve(dir, 'characters.json'), all = readCharacters(file);
  if (Object.hasOwn(all, `${uid}:${key}`)) { delete all[`${uid}:${key}`]; writeFileSync(file + '.tmp', JSON.stringify(all)); renameSync(file + '.tmp', file); }
  return n;
}

// The engine's command line and options for a character of this name.
export function engineLaunch(rawName, manifest, rawChoice) {
  const name = cleanPlayerName(rawName);
  const { role, race, gender, align } = resolveChoice(rawChoice);
  return {
    name, choice: { role, race, gender, align },
    args: ['-d', manifest.cwd, '-u', name, '-p', role, '-r', race],
    options: `windowtype:bridge,name:${name},role:${role},race:${race},gender:${gender},align:${align},pettype:cat,!news,autodig,autopickup,pickup_types:$/!?=",force_invmenu`,
  };
}

// Hosts the engine API answers to: this machine, a Cloudflare quick tunnel, and any host named in
// DEANHACK_HOSTS (comma separated, no port), which is how a real domain behind HTTPS is allowed.
export function hostAllowed(host, extra = process.env.DEANHACK_HOSTS || '') {
  if (!host) return false;
  if (/^(?:127\.0\.0\.1|localhost):\d+$/.test(host) || /^[a-z0-9-]+\.trycloudflare\.com$/i.test(host)) return true;
  return extra.split(',').map(h => h.trim().toLowerCase()).filter(Boolean).includes(host.toLowerCase());
}
// Each player gets a number, kept in <var>/players.json, that the engine uses as its uid
// (DEANHACK_UID, see bridge_uid in bridge.c), so saves of the same character name never collide.
// Four digits always, so <number><name> in a save file name can be split without guessing.
export const FIRST_PLAYER_UID = 2001;
export function allocateUid(file, playerId, first = FIRST_PLAYER_UID) {
  let data = { next: first, players: {} };
  try { const read = JSON.parse(readFileSync(file, 'utf8')); if (read && typeof read.players === 'object') data = { next: Math.max(first, Number(read.next) || first), players: read.players }; } catch {}
  if (Object.hasOwn(data.players, playerId)) return data.players[playerId];
  if (data.next > 9999) throw new Error('No player numbers left');
  const uid = data.next++;
  data.players[playerId] = uid;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file + '.tmp', JSON.stringify(data));
  renameSync(file + '.tmp', file);
  return uid;
}

// Who is asking. Behind the production proxy every request carries the logged-in name in
// X-Player-Id (the proxy sets it, overwriting anything the browser sent) and the server trusts it;
// without that (local development) everyone is one player. A trusted deployment with no usable
// name fails closed rather than falling back to a shared game.
export function playerIdOf(headers, trustProxy) {
  if (!trustProxy) return 'local';
  const raw = headers['x-player-id'];
  const id = typeof raw === 'string' ? raw.trim() : '';
  return /^[A-Za-z0-9][A-Za-z0-9_.@-]{0,63}$/.test(id) ? id : null;
}

// Guest logins. A login named in DEANHACK_GUEST_LOGINS (default `play`) is shared by anyone who
// knows it, so it must not be one game: two friends on it would be driving the same engine and
// seeing each other's keystrokes. Each browser on a guest login gets a player of its own instead,
// told apart by a random id in a cookie the server sets on the first request. Saves then belong
// to that browser (a guest on another computer is another player, which is the point of a guest
// login); a named login behaves as before. The id is only ever combined with the login name, so a
// guest can never reach a named login's game.
export const GUEST_COOKIE = 'deanhack_guest';
export function guestLogins(env = process.env.DEANHACK_GUEST_LOGINS) {
  return (env ?? 'play').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}
export function guestIdOf(cookieHeader) {
  const m = new RegExp(`(?:^|;\\s*)${GUEST_COOKIE}=([A-Za-z0-9_-]{8,64})(?:;|$)`).exec(typeof cookieHeader === 'string' ? cookieHeader : '');
  return m ? m[1] : null;
}
// The player behind a request: {id, login, guest, setCookie}. id is null when not signed in;
// setCookie is the Set-Cookie value to send when a guest browser has no id yet.
export function resolvePlayer(headers, trustProxy, {guests = guestLogins(), newId = () => randomBytes(12).toString('base64url')} = {}) {
  const login = playerIdOf(headers, trustProxy);
  if (!login) return {id: null, login: null, guest: false, setCookie: null};
  if (!trustProxy || !guests.includes(login.toLowerCase())) return {id: login, login, guest: false, setCookie: null};
  let gid = guestIdOf(headers.cookie), setCookie = null;
  if (!gid) { gid = newId(); setCookie = `${GUEST_COOKIE}=${gid}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`; }
  return {id: `${login}~${gid}`, login, guest: true, setCookie};
}

// One player's engine and everything the browser sees of it: the process, the latest frame and
// prompt, a recent message history, an event log for polling, and the open event streams.
export function createSession({ root, id, uid = null, spawnEngine = spawn, now = Date.now, onEvent = null }) {
  const token = randomBytes(24).toString('hex');
  let playerName = DEFAULT_PLAYER_NAME, playerChoice = null, stopReason = null, child = null, pending = null, frame = null, menu = null, text = null, ended = null, commands = null, buffer = '', seq = 0, lastActive = now();
  const clients = new Set(), history = [], log = [];
  // A monotonic, capped event log backs GET /engine/poll: some hosting paths (a proxy or
  // tunnel that buffers/holds back streaming responses) never deliver anything over the
  // SSE endpoint, so the client can fall back to polling this instead.
  function send(event) {
    if (event.type === 'frame') frame = event; else if (event.type === 'request') pending = event; else if (event.type === 'menu') menu = event;
    else if (event.type === 'commands') commands = event; else if (event.type === 'text') text = event; else if (event.type === 'ended') ended = event;
    else if (event.type === 'message' || event.type === 'status') { history.push(event); if (history.length > 40) history.shift(); }
    log.push({ seq: ++seq, event }); if (log.length > 500) log.shift();
    // the operator's log line: who started, who died of what, who ended and why (see the plugin)
    if (onEvent && (event.type === 'ended' || event.type === 'tombstone')) onEvent(event);
    for (const res of clients) res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
  const KINDS=['frame','request','menu','commands','text','message','status','ended','fx','combat','death','revive','pickup','teleport','wish','tombstone']; // kept compact: bridge-frame.test.js reads this line
  function start(rawName, rawChoice) {
    if (child) return;
    const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
    for (const p of [manifest.binary, manifest.cwd, manifest.home, manifest.prefix]) if (!realpathSync(p).startsWith(realpathSync(root) + sep)) throw new Error('Engine path is outside isolated runtime');
    pending = frame = menu = text = ended = commands = null; history.length = 0; buffer = '';
    const launch = engineLaunch(rawName, manifest, rawChoice); playerName = launch.name; playerChoice = launch.choice;
    const env = { PATH: process.env.PATH, HOME: manifest.home, USER: process.env.USER, LOGNAME: process.env.LOGNAME, TERM: 'dumb', NETHACKOPTIONS: launch.options, MAIL: '/dev/null' }; // MAIL: with a made-up uid the engine's mail setup looks up a passwd entry that does not exist and crashes
    if (uid !== null) env.DEANHACK_UID = String(uid);
    const proc = child = spawnEngine(manifest.binary, launch.args, { cwd: manifest.cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', chunk => {
      buffer += chunk;
      if (buffer.length > 2000000) { send({ type: 'message', text: 'Engine output exceeded protocol limit.' }); proc.stdin.end(); buffer = ''; return; }
      let i;
      while ((i = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
        if (!line.trim()) continue;
        try { const data = JSON.parse(line); if (KINDS.includes(data.type)) send(data); } catch { send({ type: 'message', text: line.slice(0, 500) }); }
      }
    });
    proc.stderr.on('data', b => send({ type: 'message', text: String(b).slice(0, 1000) }));
    proc.on('error', e => send({ type: 'message', text: e.message }));
    proc.on('close', code => {
      if (child === proc) { child = null; pending = null; }
      // why it ended, for the splash: the player's own quit or death ('exit'), the idle sweep, a server restart, or a crash
      const reason = stopReason || (code === 0 ? 'exit' : 'crash'); stopReason = null;
      send({ type: 'ended', reason, code, text: `Engine session closed (${code}). Start again to resume any saved character.` });
    });
  }
  // Ask a running engine to save and exit, and wait for it (up to `ms`); a server that is stopping
  // (a redeploy, `docker stop`) or an idle player calls this so the character is saved, not killed.
  const stop = (ms = 8000, reason = 'idle') => new Promise(done => {
    if (!child) return done();
    stopReason = reason;
    const t = setTimeout(done, ms); child.once('close', () => { clearTimeout(t); done(); }); child.stdin.end();
  });
  return {
    id, uid, token,
    get running() { return !!child; },
    get name() { return playerName; },
    get choice() { return playerChoice; },
    get idleMs() { return now() - lastActive; },
    get clientCount() { return clients.size; },
    touch() { lastActive = now(); },
    start, stop,
    input(body) {
      if (!child) throw new Error('Start the engine first');
      const reply = encodeReply(pending, JSON.parse(body)); pending = null; menu = null; text = null; child.stdin.write(reply);
    },
    // what a newly opened event stream needs to catch up
    replay() { return [...history, frame, commands, menu, text, ended, pending].filter(Boolean); },
    addClient(res) { clients.add(res); }, removeClient(res) { clients.delete(res); },
    poll(since) { return { events: log.filter(e => e.seq > since).map(e => e.event), seq }; },
    closeClients() { for (const c of clients) c.end(); clients.clear(); },
    // closing the engine's input makes it save and exit
    hangup() { child?.stdin.end(); },
  };
}

export default function enginePlugin({ trustProxy = process.env.DEANHACK_TRUST_PROXY === '1', maxEngines = Number(process.env.DEANHACK_MAX_ENGINES) || 8, idleMs = Number(process.env.DEANHACK_IDLE_MS) || 20 * 60 * 1000, spawnEngine = spawn, root = fileURLToPath(new URL('../.engine/', import.meta.url)), sweepMs = Math.min(60000, Math.max(1000, idleMs / 4)), log = console.log } = {}) {
  const sessions = new Map();
  // One line per thing an operator wants to know, so `docker compose logs app | grep session` says who is
  // playing: session start (login, character, class, resumed or new), death (what, where) and session end
  // (why). Values are key=value, quoted when they have spaces; no secrets (never the token).
  const q = v => /[\s"]/.test(String(v)) ? JSON.stringify(String(v)) : String(v);
  const line = (what, fields) => log(`deanhack ${what} ${Object.entries(fields).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}=${q(v)}`).join(' ')}`);
  // The folder that holds saves and the player numbers, if the engine has been built.
  function varDir() {
    try { const m = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8')), dir = resolve(m.prefix, 'var/unnethack'); return realpathSync(dir).startsWith(realpathSync(root) + sep) ? dir : null; } catch { return null; }
  }
  function sessionFor(playerId) {
    let session = sessions.get(playerId);
    if (session) return session;
    // Local development (one player) keeps the engine's own uid, so existing saves stay readable.
    const uid = trustProxy ? allocateUid(resolve(varDir() ?? root, 'players.json'), playerId) : null;
    session = createSession({ root, id: playerId, uid, spawnEngine, onEvent: event => {
      if (event.type === 'tombstone') line('death', { player: playerId, name: event.name, killer: event.killer, depth: event.depth, dungeon: event.dungeon });
      else line('session end', { player: playerId, name: session.name, reason: event.reason, code: event.code, running: running() });
    } });
    sessions.set(playerId, session);
    return session;
  }
  const running = () => [...sessions.values()].filter(s => s.running).length;
  const stopAll = (ms = 8000) => Promise.all([...sessions.values()].map(s => s.stop(ms, 'shutdown')));
  // An engine nobody is talking to for a while is saved and stopped, so a closed tab does not hold a slot.
  const sweep = setInterval(() => { for (const s of sessions.values()) if (s.running && s.idleMs > idleMs) { s.touch(); void s.stop(); } }, sweepMs);
  sweep.unref?.();
  return {
    name: 'deanhack-engine', stop: stopAll, sessions, sessionFor,
    configureServer(server) {
      server.httpServer?.on('close', () => { clearInterval(sweep); for (const s of sessions.values()) { s.hangup(); s.closeClients(); } });
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]; if (!path?.startsWith('/engine/')) return next();
        const host = req.headers.host;
        // Vite may be opened as either localhost or 127.0.0.1 (both the local machine),
        // or through a Cloudflare quick tunnel (random *.trycloudflare.com host, HTTPS,
        // no port) for sharing a running instance with someone off-machine. Reject
        // anything else; same-origin still required either way.
        const originHost = req.headers.origin ? req.headers.origin.replace(/^https?:\/\//, '') : null;
        if (!host || !hostAllowed(host) || (originHost && originHost !== host)) { res.writeHead(403); res.end('Local or tunnel same-origin requests only'); return; }
        const who = resolvePlayer(req.headers, trustProxy), cookie = who.setCookie ? { 'Set-Cookie': who.setCookie } : {};
        const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cookie }); res.end(JSON.stringify(data)); };
        const playerId = who.id;
        if (!playerId) return json(403, { error: 'Not signed in' });
        let session;
        try { session = sessionFor(playerId); } catch (e) { return json(503, { error: e.message }); }
        session.touch();
        if (req.method === 'GET' && path === '/engine/token') return json(200, { token: session.token });
        if (req.method === 'GET' && path === '/engine/saves') {
          const dir = varDir();
          const uid = session.uid ?? process.getuid?.() ?? 0, meta = dir ? readCharacters(resolve(dir, 'characters.json')) : {};
          return json(200, { saves: dir ? listSaves(resolve(dir, 'saves'), uid).map(save => ({ ...save, ...(meta[`${uid}:${save.name}`] || {}) })) : [], guest: who.guest });
        }
        if (req.method === 'GET' && path === '/engine/scores') {
          const dir = varDir();
          return json(200, { scores: dir ? readScores(resolve(dir, 'xlogfile')) : [] });
        }
        if (req.method === 'GET' && path === '/engine/events') {
          // Disable Nagle's algorithm: SSE is many small writes, and a proxy hop (e.g. a
          // Cloudflare tunnel) can otherwise coalesce/delay them long enough to look hung.
          req.socket?.setNoDelay(true);
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...cookie }); session.addClient(res);
          // A proxy hop (Cloudflare's edge, for a tunnel) can hold back the first chunk of a
          // streaming response until enough bytes accumulate. Padding past that threshold
          // forces an immediate flush instead of leaving the client waiting on nothing.
          res.write(': connected\n\n');
          for (const event of session.replay()) res.write(`data: ${JSON.stringify(event)}\n\n`);
          const timer = setInterval(() => { session.touch(); res.write(': alive\n\n'); }, 15000);
          req.on('close', () => { clearInterval(timer); session.removeClient(res); });
          return;
        }
        if (req.method === 'GET' && path === '/engine/poll') {
          const since = Number(new URL(req.url, 'http://engine').searchParams.get('since')) || 0;
          return json(200, session.poll(since));
        }
        if (req.method !== 'POST' || req.headers['x-engine-token'] !== session.token) return json(403, { error: 'Invalid local session token' });
        try {
          let body = ''; for await (const b of req) { body += b; if (body.length > 4096) throw new Error('Request too large'); }
          if (path === '/engine/start') {
            let name; try { name = body ? JSON.parse(body).name : undefined; } catch { name = undefined; }
            if (!session.running && running() >= maxEngines) { line('dungeon full', { player: playerId, running: running(), max: maxEngines }); return json(503, { error: 'The dungeon is full right now. Try again in a few minutes.' }); }
            let choice; try { choice = body ? JSON.parse(body) : undefined; } catch { choice = undefined; }
            const dir = varDir(), uid = session.uid ?? process.getuid?.() ?? 0, key = saveKey(name);
            // a name that already has a save resumes it: the class comes from the save, not from this request
            const resumes = !!dir && listSaves(resolve(dir, 'saves'), uid).some(save => save.name === key);
            session.start(name, choice);
            const c = session.choice || {};
            line('session start', { player: playerId, name: session.name, role: c.role, race: c.race, gender: c.gender, align: c.align, resume: resumes, running: running() });
            if (dir && !resumes) { try { rememberCharacter(resolve(dir, 'characters.json'), `${uid}:${key}`, session.choice); } catch {} }
            return json(200, { ok: true, name: session.name, choice: session.choice });
          }
          if (path === '/engine/input') { session.input(body); return json(200, { ok: true }); }
          if (path === '/engine/forget') {
            let name; try { name = JSON.parse(body).name; } catch { name = undefined; }
            const key = saveKey(name), dir = varDir(), uid = session.uid ?? process.getuid?.() ?? 0;
            if (session.running && saveKey(session.name) === key) throw new Error('That character is playing right now. Save and quit first.');
            if (!dir) throw new Error('The engine is not built');
            return json(200, { ok: true, removed: forgetCharacter(dir, uid, key) });
          }
          return json(404, { error: 'Unknown action' });
        } catch (e) { return json(400, { error: e.message }); }
      });
    },
  };
}
