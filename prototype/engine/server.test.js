import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeReply,cleanPlayerName,engineLaunch,DEFAULT_PLAYER_NAME} from './server.js';
import {bareMore,groundNotice} from '../ground-notice.js';
test('stale and duplicate requests cannot advance the game',()=>{assert.throws(()=>encodeReply({id:2,kind:'command'},{id:1,value:46}));assert.throws(()=>encodeReply(null,{id:2,value:46}));});
test('line replies cannot inject a second turn',()=>{assert.throws(()=>encodeReply({id:1,kind:'line'},{id:1,value:'foo\n46'}));assert.equal(encodeReply({id:1,kind:'line'},{id:1,value:'inventory'}),'inventory\n');});
test('keys and menu replies are bounded',()=>{assert.equal(encodeReply({id:1,kind:'command'},{id:1,value:46}),'46\n');assert.throws(()=>encodeReply({id:1,kind:'command'},{id:1,value:999}));assert.throws(()=>encodeReply({id:1,kind:'menu'},{id:1,value:'0\n1'}));assert.equal(encodeReply({id:1,kind:'menu'},{id:1,value:'0,2'}),'0,2\n');});
test('a bare --More-- with no text window auto-continues; one with text still asks',()=>{assert.equal(bareMore({kind:'more'},[]),true);assert.equal(bareMore({kind:'more'},['  ']),true);assert.equal(bareMore({kind:'more'},['You see here a scroll.']),false);assert.equal(bareMore({kind:'key'},[]),false);});
test('ground notices survive preceding messages and auto-continue',()=>{assert.deepEqual(groundNotice({kind:'more'},['There is a grave here.','Things that are here:','a bell','127 gold pieces']),['a bell','127 gold pieces']);});

test('the player name is cleaned to something safe for the engine, and defaults to Wanderer',()=>{
  assert.equal(DEFAULT_PLAYER_NAME,'Wanderer');
  assert.equal(cleanPlayerName('Dean'),'Dean');
  assert.equal(cleanPlayerName("  Mary Jane O'Neil  "),"Mary Jane O'Neil");
  assert.equal(cleanPlayerName('Mary-Jane'),'MaryJane','a hyphen would start a role suffix in NetHack');
  assert.equal(cleanPlayerName('a,b;c\n"d"'),'abcd','no commas, quotes or control characters');
  assert.equal(cleanPlayerName('-x'),'x','a leading hyphen is stripped, so it can never read as an option');
  assert.equal(cleanPlayerName("'quoted"),'Wanderer','must start with a letter or digit');
  assert.equal(cleanPlayerName('---'),'Wanderer');
  assert.equal(cleanPlayerName(''),'Wanderer');
  assert.equal(cleanPlayerName(undefined),'Wanderer');
  assert.equal(cleanPlayerName(42),'Wanderer');
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
  assert.equal(fallback.name,'Wanderer');
  assert.ok(fallback.options.includes('name:Wanderer,'));
});
