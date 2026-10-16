import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeReply,cleanPlayerName,engineLaunch,DEFAULT_PLAYER_NAME,playerIdOf,resolvePlayer,guestIdOf,guestLogins,GUEST_COOKIE} from './server.js';
import {bareMore,groundNotice} from '../ground-notice.js';
test('stale and duplicate requests cannot advance the game',()=>{assert.throws(()=>encodeReply({id:2,kind:'command'},{id:1,value:46}));assert.throws(()=>encodeReply(null,{id:2,value:46}));});
test('line replies cannot inject a second turn',()=>{assert.throws(()=>encodeReply({id:1,kind:'line'},{id:1,value:'foo\n46'}));assert.equal(encodeReply({id:1,kind:'line'},{id:1,value:'inventory'}),'inventory\n');});
test('keys and menu replies are bounded',()=>{assert.equal(encodeReply({id:1,kind:'command'},{id:1,value:46}),'46\n');assert.throws(()=>encodeReply({id:1,kind:'command'},{id:1,value:999}));assert.throws(()=>encodeReply({id:1,kind:'menu'},{id:1,value:'0\n1'}));assert.equal(encodeReply({id:1,kind:'menu'},{id:1,value:'0,2'}),'0,2\n');});
test('a bare --More-- with no text window auto-continues; one with text still asks',()=>{assert.equal(bareMore({kind:'more'},[]),true);assert.equal(bareMore({kind:'more'},['  ']),true);assert.equal(bareMore({kind:'more'},['You see here a scroll.']),false);assert.equal(bareMore({kind:'key'},[]),false);});
test('ground notices survive preceding messages and auto-continue',()=>{assert.deepEqual(groundNotice({kind:'more'},['There is a grave here.','Things that are here:','a bell','127 gold pieces']),['a bell','127 gold pieces']);});

test('the player name is cleaned to something safe for the engine, and defaults to Adventurer',()=>{
  assert.equal(DEFAULT_PLAYER_NAME,'Adventurer');
  assert.equal(cleanPlayerName('Dean'),'Dean');
  assert.equal(cleanPlayerName("  Mary Jane O'Neil  "),"Mary Jane O'Neil");
  assert.equal(cleanPlayerName('Mary-Jane'),'MaryJane','a hyphen would start a role suffix in NetHack');
  assert.equal(cleanPlayerName('a,b;c\n"d"'),'abcd','no commas, quotes or control characters');
  assert.equal(cleanPlayerName('-x'),'x','a leading hyphen is stripped, so it can never read as an option');
  assert.equal(cleanPlayerName("'quoted"),'Adventurer','must start with a letter or digit');
  assert.equal(cleanPlayerName('---'),'Adventurer');
  assert.equal(cleanPlayerName(''),'Adventurer');
  assert.equal(cleanPlayerName(undefined),'Adventurer');
  assert.equal(cleanPlayerName(42),'Adventurer');
  assert.equal(cleanPlayerName('x'.repeat(100)).length,24);
  assert.equal(cleanPlayerName('Ünïcode'),'ncode');
});

test('the engine is launched for the chosen name, in both the arguments and the options',()=>{
  const launch=engineLaunch('Dean',{cwd:'/runtime'});
  assert.equal(launch.name,'Dean');
  assert.deepEqual(launch.args.slice(launch.args.indexOf('-u'),launch.args.indexOf('-u')+2),['-u','Dean']);
  assert.match(launch.options,/(^|,)name:Dean,role:Valkyrie,/);
  assert.match(launch.options,/autodig,autopickup/,'the other defaults are unchanged');
  const fallback=engineLaunch('!!!',{cwd:'/runtime'});
  assert.equal(fallback.name,'Adventurer');
  assert.ok(fallback.options.includes('name:Adventurer,'));
});

test('a named login is one player; a guest login is one player per browser, by a cookie the server sets once',()=>{
  const guests=['play'];
  assert.deepEqual(resolvePlayer({'x-player-id':'alice'},true,{guests}),{id:'alice',login:'alice',guest:false,setCookie:null});
  const first=resolvePlayer({'x-player-id':'play'},true,{guests,newId:()=>'abcdefgh1234'});
  assert.equal(first.id,'play~abcdefgh1234');assert.equal(first.guest,true);
  assert.match(first.setCookie,new RegExp(`^${GUEST_COOKIE}=abcdefgh1234; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly$`));
  const again=resolvePlayer({'x-player-id':'play',cookie:`other=1; ${GUEST_COOKIE}=abcdefgh1234`},true,{guests,newId:()=>{throw new Error('no new id when the cookie is there');}});
  assert.equal(again.id,'play~abcdefgh1234');assert.equal(again.setCookie,null);
  assert.equal(resolvePlayer({'x-player-id':'Play'},true,{guests,newId:()=>'zzzzzzzz'}).id,'Play~zzzzzzzz','the login name keeps its case, the match does not');
  assert.equal(resolvePlayer({'x-player-id':'play'},false,{guests}).id,'local','local development is one player');
  assert.equal(resolvePlayer({},true,{guests}).id,null,'no login, no player');
  assert.equal(playerIdOf({'x-player-id':'alice'},true),'alice');
});

test('a guest cookie is read strictly and a bad one is ignored',()=>{
  assert.equal(guestIdOf(`${GUEST_COOKIE}=abcdefgh1234`),'abcdefgh1234');
  assert.equal(guestIdOf(`a=b; ${GUEST_COOKIE}=abcdefgh1234; c=d`),'abcdefgh1234');
  assert.equal(guestIdOf(`${GUEST_COOKIE}=short`),null);
  assert.equal(guestIdOf(`${GUEST_COOKIE}=has space1234`),null);
  assert.equal(guestIdOf(`not${GUEST_COOKIE}=abcdefgh1234`),null);
  assert.equal(guestIdOf(undefined),null);
  assert.deepEqual(guestLogins(undefined),['play']);assert.deepEqual(guestLogins('Play, demo ,'),['play','demo']);assert.deepEqual(guestLogins(''),[]);
});
