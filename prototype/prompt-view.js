// What the request dialog says above an engine prompt, and what it shows under a death question.
//
// The engine asks most things with a prompt of its own ("What do you want to wield?"), and the
// dialog heads those "UNNETHACK ASKS". An inventory listing arrives as a menu with no prompt at
// all (the pack after "Do you want your possessions identified?", a plain `i`), which used to
// head itself "UNNETHACK ASKS / UnNetHack". That listing is not a question, so it heads
// "YOUR PACK / Your possessions" instead.
export function promptHeading(request){
  const prompt=String(request?.prompt??'').trim();
  if(prompt)return {kicker:'UNNETHACK ASKS',title:prompt};
  if(request?.kind==='menu')return {kicker:'YOUR PACK',title:'Your possessions'};
  return {kicker:'UNNETHACK ASKS',title:'UnNetHack'};
}

// The end-of-game questions ("Do you want your possessions identified?", "...see what you had
// when you died?") come after the last blow, when it is often unclear what killed you. These
// show the tail of the message log, oldest first, so the death reads in its own words.
export const DEATH_RECAP_LINES=10;
const DEATH_QUESTION=/possessions identified|see what you had when you/i;
export function deathRecap(request,rows,limit=DEATH_RECAP_LINES){
  if(request?.kind!=='key'||!DEATH_QUESTION.test(String(request.prompt??'')))return [];
  if(!Array.isArray(rows))return [];
  return rows.slice(0,limit).reverse();
}
