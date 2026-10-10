export function groundNotice(request,lines){
 if(request?.kind!=='more'||!Array.isArray(lines))return null;
 const content=lines.map(line=>String(line).trim()).filter(Boolean);
 // look_here (invent.c): "Things that are here:", "Other things that are here:" after picking some
 // up, "Things that you feel here:" when blind. All go to the ground panel, never a dialog.
 const header=content.findIndex(line=>/^(?:Other t|T)hings that (?:are|you feel) here:$/.test(line));
 if(header<0)return null;
 return content.slice(header+1);
}
export function groundTile(frame){return frame?`${frame.branch}:${frame.depth}:${frame.player.x}:${frame.player.z}`:null;}
// A --More-- with no text window behind it only pauses on the message line, which the HUD
// already shows, so it is answered without a dialog.
export function bareMore(request,lines){return request?.kind==='more'&&!(Array.isArray(lines)&&lines.some(line=>String(line).trim()));}
