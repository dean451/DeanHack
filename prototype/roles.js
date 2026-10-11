// The characters UnNetHack lets you start as, taken from src/role.c: what each role may be (races,
// genders, alignments) and what each race allows. The server checks every launch against this and
// the class screen offers only what is valid, so the two can never disagree. Plain data and pure
// functions, no Node imports, so the browser can load it too.

export const ALIGNS=['lawful','neutral','chaotic'];
export const GENDERS=['female','male'];

export const RACES={
  human:{label:'Human',aligns:['lawful','neutral','chaotic']},
  elf:{label:'Elf',aligns:['chaotic']},
  dwarf:{label:'Dwarf',aligns:['lawful']},
  gnome:{label:'Gnome',aligns:['neutral']},
  orc:{label:'Orc',aligns:['chaotic']},
  vampire:{label:'Vampire',aligns:['neutral','chaotic']},
};

// difficulty: how forgiving the opening levels are for someone who has not played before.
export const ROLES={
  Archeologist:{label:'Archeologist',difficulty:'medium',races:['human','dwarf','gnome','vampire'],genders:['male','female'],aligns:['lawful','neutral'],blurb:'Quick and curious, with a pick-axe to dig out of trouble. Weak in a fight.'},
  Barbarian:{label:'Barbarian',difficulty:'easy',races:['human','orc','vampire'],genders:['male','female'],aligns:['neutral','chaotic'],blurb:'A two-handed sword, poison resistance and a great deal of health.'},
  Caveman:{label:'Caveman',difficulty:'medium',races:['human','dwarf','gnome','vampire'],genders:['male','female'],aligns:['lawful','neutral'],blurb:'Sturdy and plain: a club, a sling and a loyal dog.'},
  Convict:{label:'Convict',difficulty:'hard',races:['human','dwarf','gnome','orc','vampire'],genders:['male','female'],aligns:['chaotic'],blurb:'An escaped prisoner with an iron ball chained to one leg. Tough, and hunted.'},
  Healer:{label:'Healer',difficulty:'hard',races:['human','gnome'],genders:['male','female'],aligns:['neutral'],blurb:'Frail, poison-proof and rich, with healing spells and a stethoscope.'},
  Knight:{label:'Knight',difficulty:'medium',races:['human'],genders:['male','female'],aligns:['lawful'],blurb:'Lance, long sword and armour, bound by a code of honour.'},
  Monk:{label:'Monk',difficulty:'medium',races:['human'],genders:['male','female'],aligns:['lawful','neutral','chaotic'],blurb:'Fast martial artist who fights bare-handed and wears no armour.'},
  Priest:{label:'Priest',difficulty:'medium',races:['human','elf'],genders:['male','female'],aligns:['lawful','neutral','chaotic'],blurb:'Sees every item as blessed or cursed. A mace and holy spells.'},
  Rogue:{label:'Rogue',difficulty:'medium',races:['human','orc','vampire'],genders:['male','female'],aligns:['chaotic'],blurb:'Throws daggers in volleys, sneaks and steals.'},
  Ranger:{label:'Ranger',difficulty:'medium',races:['human','elf','gnome','orc'],genders:['male','female'],aligns:['neutral','chaotic'],blurb:'A bow, a quiver and a cloak that hides them. Sharp-eyed.'},
  Samurai:{label:'Samurai',difficulty:'easy',races:['human'],genders:['male','female'],aligns:['lawful'],blurb:'Fast and deadly with a katana and a bow.'},
  Tourist:{label:'Tourist',difficulty:'hard',races:['human'],genders:['male','female'],aligns:['neutral'],blurb:'Weak, rich and underprepared: darts, a camera and a bright shirt.'},
  Valkyrie:{label:'Valkyrie',difficulty:'easy',races:['human','dwarf'],genders:['female'],aligns:['lawful','neutral'],blurb:'The strongest start: cold-proof, with a long sword and a dagger.'},
  Wizard:{label:'Wizard',difficulty:'medium',races:['human','elf','gnome','orc','vampire'],genders:['male','female'],aligns:['neutral','chaotic'],blurb:'A fragile spellcaster with force bolt, a quarterstaff and a magic cloak.'},
};
export const ROLE_NAMES=Object.keys(ROLES);
export const DEFAULT_CHOICE=Object.freeze({role:'Valkyrie',race:'human',gender:'female',align:'lawful'});

// The alignments this role may have as this race.
export function alignsFor(role,race){
  const r=ROLES[role],c=RACES[race];
  return r&&c?r.aligns.filter(a=>c.aligns.includes(a)):[];
}

// What can still be chosen for this role: races, genders, and alignments for the given race.
export function optionsFor(role,race){
  const r=ROLES[role]||ROLES[DEFAULT_CHOICE.role];
  const races=r.races.filter(x=>alignsFor(role,x).length);
  const useRace=races.includes(race)?race:races[0];
  return {races,genders:r.genders,aligns:alignsFor(role,useRace)};
}

// Whatever was asked for, a valid character: unknown or impossible parts fall back to the first
// valid option for that role (human, then female, then the first alignment that fits).
export function resolveChoice(raw){
  const want=raw&&typeof raw==='object'?raw:{};
  const role=Object.hasOwn(ROLES,want.role)?want.role:DEFAULT_CHOICE.role;
  const {races}=optionsFor(role);
  const race=races.includes(want.race)?want.race:races.includes('human')?'human':races[0];
  const {genders,aligns}=optionsFor(role,race);
  const gender=genders.includes(want.gender)?want.gender:genders.includes('female')?'female':genders[0];
  const align=aligns.includes(want.align)?want.align:aligns[0];
  return {role,race,gender,align};
}
