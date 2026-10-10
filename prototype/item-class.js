// Class marks for pack rows: each item row carries a small shape for its class (read from the
// engine's heading above it), a first step toward a grid of item models. Shape, not colour.
const MARKS=[
 [/^weapons?/i,'†'],[/^armou?r/i,'⛨'],[/^rings?/i,'○'],[/^amulets?/i,'♁'],[/^tools?/i,'⚒'],
 [/^comestibles?|^food/i,'♨'],[/^potions?/i,'⚗'],[/^scrolls?/i,'≡'],[/^spellbooks?/i,'▤'],
 [/^wands?/i,'/'],[/^coins?/i,'◎'],[/^gems?|^rocks?|^gray stones?/i,'◆'],[/^boulders?|^statues?/i,'▲'],
 [/^iron balls?|^chains?/i,'⛓'],[/^venoms?/i,'☠'],
];
export function itemClassMark(heading){
 const text=String(heading||'').trim();
 for(const [re,mark] of MARKS)if(re.test(text))return mark;
 return '';
}

// Long pack lists lay out in two columns so the whole pack is seen at once; short ones stay a single list.
export const GRID_FROM=12;
export function menuColumns(selectableCount){
 return Number(selectableCount)>=GRID_FROM?2:1;
}
